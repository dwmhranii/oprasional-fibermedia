<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerSecretResource extends JsonResource
{
    /**
     * Transform the resource into an array containing decrypted sensitive credentials.
     * Hanya boleh diakses oleh pengguna dengan izin 'customers.view_secret'.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_code' => $this->customer_code,
            'name' => $this->name,
            'username' => $this->username,
            'nik' => $this->nik, // Eloquent decrypted via cast
            'password' => $this->password, // Eloquent decrypted via cast
        ];
    }
}
