<?php

return [
    'province' => env('OPERATIONAL_PROVINCE', 'Jawa Timur'),
    'cities' => explode(',', env('OPERATIONAL_REGIONS', 'Kota Malang,Kabupaten Malang')),
    'default_city' => env('DEFAULT_CITY', 'Kota Malang'),

    /*
    |--------------------------------------------------------------------------
    | Hierarchical Regions Data: Kab/Kota -> Kecamatan -> Kelurahan / Desa
    |--------------------------------------------------------------------------
    */
    'hierarchy' => [
        'Kota Malang' => [
            'Klojen' => [
                'Bareng', 'Gadingkasri', 'Kasin', 'Kauman', 'Kiduldalem',
                'Klojen', 'Oro-Oro Dowo', 'Penanggungan', 'Rampal Celaket',
                'Samaan', 'Sukoharjo',
            ],
            'Blimbing' => [
                'Arjosari', 'Balearjosari', 'Blimbing', 'Jodipan', 'Kesatrian',
                'Pandanwangi', 'Polehan', 'Polowijen', 'Purwantoro', 'Purwodadi',
            ],
            'Lowokwaru' => [
                'Dinoyo', 'Jatimulyo', 'Ketawanggede', 'Lowokwaru', 'Merjosari',
                'Mojolangu', 'Sumbersari', 'Tasikmadu', 'Tlogomas', 'Tulusrejo',
                'Tunggulwulung',
            ],
            'Sukun' => [
                'Bakalankrajan', 'Bandulan', 'Bandungrejosari', 'Ciptomulyo',
                'Gadang', 'Karangbesuki', 'Kebonsari', 'Mulyorejo', 'Pisangcandi',
                'Sukun', 'Tanjungrejo',
            ],
            'Kedungkandang' => [
                'Arjowinangun', 'Bumiayu', 'Buring', 'Cemorokandang', 'Kedungkandang',
                'Kotalama', 'Lesanpuro', 'Madyopuro', 'Mergosono', 'Sawojajar',
                'Tlogowaru', 'Wonokoyo',
            ],
        ],

        'Kabupaten Malang' => [
            'Kepanjen' => [
                'Ardirejo', 'Cepokomulyo', 'Curungrejo', 'Dilem', 'Jatirejoyoso',
                'Jenggolo', 'Kedungpedaringan', 'Kepanjen', 'Mangunrejo', 'Mojosari',
                'Ngadilangkung', 'Panggungrejo', 'Penarukan', 'Sengguruh', 'Sukoraharjo',
                'Talangagung', 'Tegalsari',
            ],
            'Singosari' => [
                'Ardimulyo', 'Banjararum', 'Baturetno', 'Candirenggo', 'Dengkol',
                'Gunungrejo', 'Klampok', 'Lang-Lang', 'Losari', 'Pagentan',
                'Purwoasri', 'Randuagung', 'Tamanharjo', 'Toyomarto', 'Tunjungtirto',
                'Watugede', 'Wonorejo',
            ],
            'Lawang' => [
                'Bedali', 'Kalirejo', 'Ketindan', 'Lawang', 'Mulyoarjo',
                'Sidodadi', 'Srigading', 'Sumberngepoh', 'Sumberporong', 'Turirejo',
                'Wonorejo',
            ],
            'Dau' => [
                'Gadingkulon', 'Kalisongo', 'Karangwidoro', 'Kucur', 'Landungsari',
                'Mulyoagung', 'Petungsewu', 'Selorejo', 'Sumbersekar',
            ],
            'Pakis' => [
                'Ampeldento', 'Asrikaton', 'Banjarejo', 'Bunutwetan', 'Kedungrejo',
                'Mangliawan', 'Pakisjajar', 'Pakiskembar', 'Pucangsongo', 'Saptorenggo',
                'Sekarpuro', 'Semberkradenan', 'Sumberpasir', 'Tirtomoyo',
            ],
            'Karangploso' => [
                'Ampeldento', 'Bojonegoro', 'Donowarih', 'Girimoyo', 'Kepuharjo',
                'Ngenep', 'Ngijo', 'Tawangargo', 'Tegalgondo',
            ],
            'Pujon' => [
                'Bendosari', 'Madiredo', 'Ngabab', 'Ngroto', 'Pandansari',
                'Pujon Kidul', 'Pujon Lor', 'Sukomulyo', 'Tawangsari', 'Wiyurejo',
            ],
            'Turen' => [
                'Gedog Kulon', 'Gedog Wetan', 'Jeru', 'Kedok', 'Kemulan',
                'Pagentan', 'Sanankerto', 'Sananrejo', 'Sawahan', 'Sedayu',
                'Talangsuko', 'Talok', 'Tangkilsari', 'Tanjungsari', 'Tumpukrenteng',
                'Turen',
            ],
            'Bululawang' => [
                'Bakalan', 'Bululawang', 'Gading', 'Kasembon', 'Kasri',
                'Krebet', 'Krebet Senggrong', 'Kuasam', 'Lumbangsari', 'Pringu',
                'Sempalwadak', 'Sudimoro', 'Sukonolo', 'Wandanpuro',
            ],
            'Wagir' => [
                'Dalisodo', 'Gondowangi', 'Jedong', 'Mendalanwangi', 'Pandanlandung',
                'Pandanrejo', 'Parangargo', 'Petungsewu', 'Sitirejo', 'Sukodadi',
                'Sumbersuko',
            ],
        ],
    ],
];
