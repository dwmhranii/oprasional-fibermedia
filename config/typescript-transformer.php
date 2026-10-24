<?php

return [
    /*
     * The paths where typescript-transformer will look for PHP classes
     * to transform to TypeScript.
     */
    'auto_discover_types' => [
        app_path('Models'),
        app_path('Http/Resources'),
        app_path('Enums'),
    ],

    /*
     * Collectors will search for classes in the `auto_discover_types` paths and
     * return them in a way that can be used by the transformers.
     */
    'collectors' => [
        Spatie\TypeScriptTransformer\Collectors\DefaultCollector::class,
        Spatie\TypeScriptTransformer\Collectors\EnumCollector::class,
    ],

    /*
     * Transformers take PHP classes and transform them to TypeScript code.
     */
    'transformers' => [
        Spatie\TypeScriptTransformer\Transformers\EnumTransformer::class,
    ],

    /*
     * In this array you can configure which PHP classes should be transformed
     * to which TypeScript types.
     */
    'default_type_replacements' => [
        DateTime::class => 'string',
        DateTimeImmutable::class => 'string',
        Carbon\CarbonInterface::class => 'string',
        Carbon\Carbon::class => 'string',
        Carbon\CarbonImmutable::class => 'string',
    ],

    /*
     * The path where the generated TypeScript file will be written.
     */
    'output_file' => resource_path('js/shared/types/api.generated.ts'),

    /*
     * The writer that will write the generated TypeScript code.
     */
    'writer' => Spatie\TypeScriptTransformer\Writers\TypeDefinitionWriter::class,

    /*
     * The formatter that will format the generated TypeScript code.
     */
    'formatter' => null,
];
