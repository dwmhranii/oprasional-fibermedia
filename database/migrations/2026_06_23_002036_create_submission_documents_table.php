<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('submission_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained()->cascadeOnDelete();
            $table->string('document_type');
            $table->string('original_name');
            $table->string('path');
            $table->string('status')->default('pending_review'); // pending_review, approved, rejected, needs_revision
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Migrate existing JSON documents to the new table
        $submissions = DB::table('submissions')->get(['id', 'documents']);
        foreach ($submissions as $submission) {
            if (empty($submission->documents)) {
                continue;
            }

            $docs = json_decode($submission->documents, true);
            if (is_array($docs)) {
                $isLegacy = false;
                foreach ($docs as $key => $val) {
                    if (! is_numeric($key) && is_string($val)) {
                        $isLegacy = true;
                        break;
                    }
                }

                $normalized = [];
                if ($isLegacy) {
                    foreach ($docs as $type => $val) {
                        if (is_string($val)) {
                            $normalized[] = [
                                'document_type' => $type,
                                'original_name' => basename($val),
                                'path' => $val,
                            ];
                        }
                    }
                } else {
                    $normalized = $docs;
                }

                foreach ($normalized as $doc) {
                    if (isset($doc['document_type']) && isset($doc['path'])) {
                        DB::table('submission_documents')->insert([
                            'submission_id' => $submission->id,
                            'document_type' => $doc['document_type'],
                            'original_name' => $doc['original_name'] ?? basename($doc['path']),
                            'path' => $doc['path'],
                            'status' => 'approved', // Legacy documents are considered implicitly approved
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('submission_documents');
    }
};
