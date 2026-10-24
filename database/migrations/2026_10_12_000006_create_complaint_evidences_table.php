<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('complaint_evidences')) {
            Schema::create('complaint_evidences', function (Blueprint $table) {
                $table->id();
                $table->foreignId('complaint_id')->constrained('complaints')->onDelete('cascade');
                $table->foreignId('assignment_id')->constrained('complaint_assignments')->onDelete('cascade');

                $table->json('photos'); // Array URL/path foto bukti fisik
                $table->text('description'); // Ringkasan/catatan teknisi
                $table->enum('resolution_category', [
                    'cable_broken',
                    'ont_faulty',
                    'ont_reset',
                    'splitter_odp_issue',
                    'config_issue',
                    'customer_side',
                    'billing_resolved',
                    'other',
                ]);

                $table->timestamp('submitted_at')->useCurrent();
                $table->timestamps();

                $table->index('complaint_id');
                $table->index('assignment_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_evidences');
    }
};
