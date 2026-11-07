<?php

namespace App\Services;

class TotpService
{
    private const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Hasilkan secret TOTP acak 32 karakter Base32.
     */
    public function generateSecret(int $length = 32): string
    {
        $secret = '';
        $alphabetLength = strlen(self::BASE32_ALPHABET);
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::BASE32_ALPHABET[random_int(0, $alphabetLength - 1)];
        }

        return $secret;
    }

    /**
     * Hitung kode OTP saat ini berdasarkan timestamp (RFC 6238).
     */
    public function getCode(string $secret, ?int $timestamp = null, int $period = 30, int $digits = 6): string
    {
        $timestamp = $timestamp ?? time();
        $timeSlice = (int) floor($timestamp / $period);

        $binarySecret = $this->base32Decode($secret);
        $timeData = pack('N*', 0) . pack('N*', $timeSlice);

        $hmac = hash_hmac('sha1', $timeData, $binarySecret, true);
        $offset = ord(substr($hmac, -1)) & 0x0F;

        $unpacked = unpack('N', substr($hmac, $offset, 4));
        $hashPart = $unpacked[1] & 0x7FFFFFFF;

        $modulo = 10 ** $digits;
        $code = (string) ($hashPart % $modulo);

        return str_pad($code, $digits, '0', STR_PAD_LEFT);
    }

    /**
     * Verifikasi kode TOTP dengan toleransi jendela waktu ±1 (±30 detik).
     */
    public function verify(string $secret, string $code, int $window = 1, ?int $timestamp = null): bool
    {
        $cleanCode = trim($code);
        if (strlen($cleanCode) !== 6 || ! ctype_digit($cleanCode)) {
            return false;
        }

        $timestamp = $timestamp ?? time();
        for ($i = -$window; $i <= $window; $i++) {
            $expected = $this->getCode($secret, $timestamp + ($i * 30));
            if (hash_equals($expected, $cleanCode)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Hasilkan 8 kode pemulihan darurat (recovery codes) acak.
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = sprintf('%04d-%04d', random_int(1000, 9999), random_int(1000, 9999));
        }

        return $codes;
    }

    /**
     * Buat URL otpauth:// untuk pemindaian aplikasi Google Authenticator / 2FA.
     */
    public function getOtpAuthUrl(string $issuer, string $accountName, string $secret): string
    {
        $cleanIssuer = rawurlencode($issuer);
        $cleanAccount = rawurlencode($accountName);

        return "otpauth://totp/{$cleanIssuer}:{$cleanAccount}?secret={$secret}&issuer={$cleanIssuer}&algorithm=SHA1&digits=6&period=30";
    }

    /**
     * Dekode string Base32 menjadi biner.
     */
    private function base32Decode(string $base32): string
    {
        $base32 = strtoupper(trim($base32));
        $binary = '';
        $buffer = 0;
        $bufferLength = 0;

        for ($i = 0, $len = strlen($base32); $i < $len; $i++) {
            $char = $base32[$i];
            $val = strpos(self::BASE32_ALPHABET, $char);
            if ($val === false) {
                continue;
            }

            $buffer = ($buffer << 5) | $val;
            $bufferLength += 5;

            if ($bufferLength >= 8) {
                $bufferLength -= 8;
                $binary .= chr(($buffer >> $bufferLength) & 0xFF);
            }
        }

        return $binary;
    }
}

