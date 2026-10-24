<?php

namespace App\Services\Mikrotik;

use Exception;

class MikrotikApiClient
{
    protected static bool $faked = false;

    /** @var array<int|string, array<int, array<string, mixed>>|\Throwable> */
    protected static array $mockResponses = [];

    /** @var resource|null */
    protected $socket = null;

    protected bool $connected = false;

    public function __construct(
        protected string $host,
        protected int $port = 8728,
        protected int $timeout = 5,
        protected bool $ssl = false
    ) {}

    /**
     * Fake the client for testing purposes.
     *
     * @param  array<int|string, array<int, array<string, mixed>>|\Throwable>  $mockResponses
     */
    public static function fake(array $mockResponses = []): void
    {
        static::$faked = true;
        static::$mockResponses = $mockResponses;
    }

    public static function restore(): void
    {
        static::$faked = false;
        static::$mockResponses = [];
    }

    /**
     * Connect and authenticate to MikroTik RouterOS API.
     */
    public function connect(string $username, ?string $password = ''): bool
    {
        if (static::$faked) {
            $key = $this->host.':'.$this->port;
            if (isset(static::$mockResponses[$key]) && static::$mockResponses[$key] instanceof \Throwable) {
                throw static::$mockResponses[$key];
            }
            if (isset(static::$mockResponses['*']) && static::$mockResponses['*'] instanceof \Throwable) {
                throw static::$mockResponses['*'];
            }
            $this->connected = true;

            return true;
        }

        $protocol = $this->ssl ? 'ssl://' : 'tcp://';
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        $this->socket = @stream_socket_client(
            $protocol.$this->host.':'.$this->port,
            $errorCode,
            $errorMessage,
            $this->timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );

        if (! is_resource($this->socket)) {
            throw new Exception("Gagal terhubung ke BRAS MikroTik ({$this->host}:{$this->port}): [{$errorCode}] {$errorMessage}");
        }

        stream_set_timeout($this->socket, $this->timeout);

        // Authenticate (RouterOS v6.43+ supports direct plain text login)
        $this->writeWord('/login');
        $this->writeWord('=name='.$username);
        $this->writeWord('=password='.($password ?? ''));
        $this->writeWord(''); // End of command

        $response = $this->readResponse();

        // If router requires challenge-response (legacy RouterOS < 6.43)
        if (isset($response[0]['!trap']) || (isset($response[0]['!done']) && isset($response[0]['ret']))) {
            $challenge = $response[0]['ret'] ?? null;
            if ($challenge) {
                $hash = md5(chr(0).($password ?? '').pack('H*', $challenge));
                $this->writeWord('/login');
                $this->writeWord('=name='.$username);
                $this->writeWord('=response=00'.$hash);
                $this->writeWord('');
                $response = $this->readResponse();
            }
        }

        if (isset($response[0]['!trap'])) {
            $msg = $response[0]['message'] ?? 'Login failed';
            throw new Exception("Autentikasi API MikroTik gagal: {$msg}");
        }

        $this->connected = true;

        return true;
    }

    /**
     * Get active PPPoE sessions from /ppp/active/print.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getActivePppoeSessions(): array
    {
        if (static::$faked) {
            $key = $this->host.':'.$this->port;
            $data = static::$mockResponses[$key] ?? static::$mockResponses['*'] ?? [];
            if ($data instanceof \Throwable) {
                throw $data;
            }

            return $data;
        }

        if (! $this->connected || ! is_resource($this->socket)) {
            throw new Exception('Koneksi ke BRAS MikroTik belum diinisialisasi.');
        }

        $this->writeWord('/ppp/active/print');
        $this->writeWord('');

        $rawResponse = $this->readResponse();
        $sessions = [];

        foreach ($rawResponse as $item) {
            if (isset($item['!re'])) {
                $sessions[] = [
                    'id' => $item['.id'] ?? null,
                    'name' => $item['name'] ?? null,
                    'service' => $item['service'] ?? 'pppoe',
                    'caller_id' => $item['caller-id'] ?? null,
                    'address' => $item['address'] ?? null,
                    'uptime' => $item['uptime'] ?? null,
                    'session_id' => $item['session-id'] ?? ($item['.id'] ?? null),
                    'encoding' => $item['encoding'] ?? null,
                ];
            }
        }

        return $sessions;
    }

    /**
     * Close socket connection.
     */
    public function disconnect(): void
    {
        if (is_resource($this->socket)) {
            fclose($this->socket);
            $this->socket = null;
        }
        $this->connected = false;
    }

    public function __destruct()
    {
        $this->disconnect();
    }

    /**
     * Write word according to RouterOS API protocol length encoding.
     */
    protected function writeWord(string $word): void
    {
        if (! is_resource($this->socket)) {
            return;
        }

        $len = strlen($word);
        if ($len < 0x80) {
            fwrite($this->socket, chr($len));
        } elseif ($len < 0x4000) {
            $len |= 0x8000;
            fwrite($this->socket, chr(($len >> 8) & 0xFF).chr($len & 0xFF));
        } elseif ($len < 0x200000) {
            $len |= 0xC00000;
            fwrite($this->socket, chr(($len >> 16) & 0xFF).chr(($len >> 8) & 0xFF).chr($len & 0xFF));
        } elseif ($len < 0x10000000) {
            $len |= 0xE0000000;
            fwrite($this->socket, chr(($len >> 24) & 0xFF).chr(($len >> 16) & 0xFF).chr(($len >> 8) & 0xFF).chr($len & 0xFF));
        } else {
            fwrite($this->socket, chr(0xF0).chr(($len >> 24) & 0xFF).chr(($len >> 16) & 0xFF).chr(($len >> 8) & 0xFF).chr($len & 0xFF));
        }

        fwrite($this->socket, $word);
    }

    /**
     * Read full sentence response from RouterOS API.
     *
     * @return array<int, array<string, string>>
     */
    protected function readResponse(): array
    {
        $response = [];
        $currentSentence = [];

        while (true) {
            $word = $this->readWord();
            if ($word === '') {
                if (! empty($currentSentence)) {
                    $response[] = $currentSentence;
                    $type = array_key_first($currentSentence);
                    if ($type === '!done' || $type === '!fatal') {
                        break;
                    }
                    $currentSentence = [];
                }

                continue;
            }

            if (str_starts_with($word, '!')) {
                $currentSentence[$word] = true;
            } elseif (str_starts_with($word, '=')) {
                $parts = explode('=', substr($word, 1), 2);
                $key = $parts[0];
                $val = $parts[1] ?? '';
                $currentSentence[$key] = $val;
            }
        }

        return $response;
    }

    /**
     * Read a word from socket based on RouterOS API length encoding.
     */
    protected function readWord(): string
    {
        if (! is_resource($this->socket)) {
            return '';
        }

        $byte = fread($this->socket, 1);
        if ($byte === false || strlen($byte) === 0) {
            return '';
        }

        $len = ord($byte);
        if (($len & 0x80) === 0) {
            // 1 byte
        } elseif (($len & 0xC0) === 0x80) {
            // 2 bytes
            $len = (($len & 0x3F) << 8) + ord(fread($this->socket, 1));
        } elseif (($len & 0xE0) === 0xC0) {
            // 3 bytes
            $len = (($len & 0x1F) << 16) + (ord(fread($this->socket, 1)) << 8) + ord(fread($this->socket, 1));
        } elseif (($len & 0xF0) === 0xE0) {
            // 4 bytes
            $len = (($len & 0x0F) << 24) + (ord(fread($this->socket, 1)) << 16) + (ord(fread($this->socket, 1)) << 8) + ord(fread($this->socket, 1));
        } elseif (($len & 0xF8) === 0xF0) {
            // 5 bytes
            fread($this->socket, 1);
            $len = (ord(fread($this->socket, 1)) << 24) + (ord(fread($this->socket, 1)) << 16) + (ord(fread($this->socket, 1)) << 8) + ord(fread($this->socket, 1));
        }

        if ($len === 0) {
            return '';
        }

        $word = '';
        while (strlen($word) < $len) {
            $chunk = fread($this->socket, min(1024, $len - strlen($word)));
            if ($chunk === false || strlen($chunk) === 0) {
                break;
            }
            $word .= $chunk;
        }

        return $word;
    }
}
