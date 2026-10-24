<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('complaints')) {
            Schema::create('complaints', function (Blueprint $table) {
                $table->id();
                $table->string('ticket_number', 25)->unique();

                // Identitas Pelanggan (input laporan)
                $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('set null');
                $table->string('customer_code', 50)->nullable();
                $table->string('customer_name');
                $table->string('customer_phone', 25);
                $table->text('customer_address');
                $table->decimal('customer_lat', 10, 7)->nullable();
                $table->decimal('customer_lng', 10, 7)->nullable();
                $table->string('area', 100);
                $table->text('whatsapp_message')->nullable();

                // Detail Tiket
                $table->enum('category', [
                    'no_signal',
                    'slow_speed',
                    'intermittent',
                    'equipment',
                    'billing',
                    'relocation',
                    'other',
                ]);
                $table->string('subject');
                $table->text('description');
                $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
                $table->enum('status', [
                    'open',
                    'assigned',
                    'in_progress',
                    'pending_customer',
                    'resolved',
                    'closed',
                    'cancelled',
                    'reopened',
                ])->default('open');

                // Pembuat
                $table->foreignId('created_by_id')->constrained('users');

                // Resolusi
                $table->enum('resolution_type', ['remote', 'onsite'])->nullable();
                $table->enum('resolution_category', [
                    'cable_broken',
                    'ont_faulty',
                    'ont_reset',
                    'splitter_odp_issue',
                    'config_issue',
                    'customer_side',
                    'billing_resolved',
                    'other',
                ])->nullable();
                $table->text('status_reason')->nullable();

                // Verifikasi Admin / SA
                $table->foreignId('verified_by_id')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamp('verified_at')->nullable();
                $table->text('verified_notes')->nullable();

                // SLA Timers & Status
                $table->timestamp('sla_response_due_at')->nullable();
                $table->timestamp('sla_resolve_due_at')->nullable();
                $table->timestamp('sla_paused_at')->nullable();
                $table->unsignedInteger('sla_paused_seconds')->default(0);
                $table->boolean('is_sla_breached')->default(false);
                $table->timestamp('first_response_at')->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamp('closed_at')->nullable();

                $table->timestamps();

                // Indexes
                $table->index('status');
                $table->index('area');
                $table->index('customer_phone');
                $table->index('customer_code');
                $table->index('priority');
                $table->index('created_at');
                $table->index(['sla_resolve_due_at', 'is_sla_breached']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
