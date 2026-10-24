<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Review fields pada tasks (PSB)
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('review_status', 30)->default('none')->index(); // none, needs_review, approved, rework, flagged
            $table->json('review_flags')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->boolean('has_port_conflict')->default(false);
            $table->foreignId('selected_odp_id')->nullable()->constrained('odps')->nullOnDelete();
            $table->unsignedSmallInteger('selected_odp_port')->nullable();
        });

        // 2. Review fields pada complaints (Gangguan)
        Schema::table('complaints', function (Blueprint $table) {
            $table->string('review_status', 30)->default('none')->index(); // none, needs_review, approved, rework, flagged
            $table->json('review_flags')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
        });

        // 3. Tambahan kolom usulan ODP dari lapangan
        Schema::table('odps', function (Blueprint $table) {
            $table->string('client_uuid', 100)->nullable()->unique();
            $table->string('status', 30)->default('approved')->index(); // approved, needs_review, rejected
            $table->boolean('is_approved')->default(true);
            $table->decimal('proposed_latitude', 10, 7)->nullable();
            $table->decimal('proposed_longitude', 10, 7)->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
        });

        // 4. Tabel rekam jejak jalur kabel lapangan (cable_tracks)
        Schema::create('cable_tracks', function (Blueprint $table) {
            $table->id();
            $table->string('client_uuid', 100)->unique();
            $table->string('name', 150);
            $table->json('coordinates'); // Array titik [[lng, lat], ...]
            $table->unsignedInteger('raw_points_count')->default(0);
            $table->unsignedInteger('simplified_points_count')->default(0);
            $table->decimal('total_length_meters', 10, 2)->default(0);
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('proposed')->index(); // proposed, approved, rejected
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cable_tracks');

        Schema::table('odps', function (Blueprint $table) {
            $table->dropForeign(['created_by_id']);
            $table->dropColumn([
                'client_uuid',
                'status',
                'is_approved',
                'proposed_latitude',
                'proposed_longitude',
                'created_by_id',
            ]);
        });

        Schema::table('complaints', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn([
                'review_status',
                'review_flags',
                'reviewed_by',
                'reviewed_at',
                'review_note',
            ]);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropForeign(['selected_odp_id']);
            $table->dropColumn([
                'review_status',
                'review_flags',
                'reviewed_by',
                'reviewed_at',
                'review_note',
                'has_port_conflict',
                'selected_odp_id',
                'selected_odp_port',
            ]);
        });
    }
};
