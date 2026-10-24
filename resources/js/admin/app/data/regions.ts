// Data wilayah Kabupaten Malang dan Kota Malang, Jawa Timur
// Sumber: Kemendagri + BPS dengan kode pos

export interface SubDistrict {
    id: string;
    name: string;
    postalCode: string;
}

export interface District {
    id: string;
    name: string;
    subDistricts: SubDistrict[];
}

export interface City {
    id: string;
    name: string;
    districts: District[];
}

export interface Province {
    id: string;
    name: string;
    cities: City[];
}

// Data Jawa Timur (fokus Malang area)
export const regions: Province[] = [
    {
        id: 'jawa-timur',
        name: 'Jawa Timur',
        cities: [
            {
                id: 'kab-malang',
                name: 'Kabupaten Malang',
                districts: [
                    {
                        id: 'kepanjen',
                        name: 'Kepanjen',
                        subDistricts: [
                            { id: 'kepanjen', name: 'Kepanjen', postalCode: '65163' },
                            { id: 'ardirejo', name: 'Ardirejo', postalCode: '65163' },
                            { id: 'cempokomulyo', name: 'Cempokomulyo', postalCode: '65163' },
                            { id: 'curungrejo', name: 'Curungrejo', postalCode: '65163' },
                            { id: 'jenggolo', name: 'Jenggolo', postalCode: '65163' },
                            { id: 'kedungpedaringan', name: 'Kedungpedaringan', postalCode: '65163' },
                            { id: 'kemiri', name: 'Kemiri', postalCode: '65163' },
                            { id: 'mangunrejo', name: 'Mangunrejo', postalCode: '65163' },
                            { id: 'mojosari', name: 'Mojosari', postalCode: '65163' },
                            { id: 'ngadilangkung', name: 'Ngadilangkung', postalCode: '65163' },
                            { id: 'panarukan', name: 'Panarukan', postalCode: '65163' },
                            { id: 'panggungrejo', name: 'Panggungrejo', postalCode: '65163' },
                            { id: 'penarukan', name: 'Penarukan', postalCode: '65163' },
                            { id: 'sengguruh', name: 'Sengguruh', postalCode: '65163' },
                            { id: 'sukoraharjo', name: 'Sukoraharjo', postalCode: '65163' },
                            { id: 'talangagung', name: 'Talangagung', postalCode: '65163' },
                            { id: 'tegalsari', name: 'Tegalsari', postalCode: '65163' },
                            { id: 'dilem', name: 'Dilem', postalCode: '65163' },
                        ],
                    },
                    {
                        id: 'singosari',
                        name: 'Singosari',
                        subDistricts: [
                            { id: 'ardimulyo', name: 'Ardimulyo', postalCode: '65153' },
                            { id: 'banjararum', name: 'Banjararum', postalCode: '65153' },
                            { id: 'candirenggo', name: 'Candirenggo', postalCode: '65153' },
                            { id: 'dengkol', name: 'Dengkol', postalCode: '65153' },
                            { id: 'gunungrejo', name: 'Gunungrejo', postalCode: '65153' },
                            { id: 'klampok', name: 'Klampok', postalCode: '65153' },
                            { id: 'koripan', name: 'Koripan', postalCode: '65153' },
                            { id: 'langlang', name: 'Langlang', postalCode: '65153' },
                            { id: 'losari', name: 'Losari', postalCode: '65153' },
                            { id: 'pagentan', name: 'Pagentan', postalCode: '65153' },
                            { id: 'purwoasri', name: 'Purwoasri', postalCode: '65153' },
                            { id: 'randuagung', name: 'Randuagung', postalCode: '65153' },
                            { id: 'tamanharjo', name: 'Tamanharjo', postalCode: '65153' },
                            { id: 'tunjungtirto', name: 'Tunjungtirto', postalCode: '65153' },
                            { id: 'watugede', name: 'Watugede', postalCode: '65153' },
                            { id: 'wonorejo', name: 'Wonorejo', postalCode: '65153' },
                            { id: 'singosari', name: 'Singosari', postalCode: '65153' },
                        ],
                    },
                    {
                        id: 'lawang',
                        name: 'Lawang',
                        subDistricts: [
                            { id: 'bedali', name: 'Bedali', postalCode: '65215' },
                            { id: 'kalirejo', name: 'Kalirejo', postalCode: '65215' },
                            { id: 'ketindan', name: 'Ketindan', postalCode: '65215' },
                            { id: 'lawang', name: 'Lawang', postalCode: '65215' },
                            { id: 'mulyoagung', name: 'Mulyoagung', postalCode: '65215' },
                            { id: 'sidodadi', name: 'Sidodadi', postalCode: '65215' },
                            { id: 'sidoluhur', name: 'Sidoluhur', postalCode: '65215' },
                            { id: 'srigading', name: 'Srigading', postalCode: '65215' },
                            { id: 'sumberporong', name: 'Sumberporong', postalCode: '65215' },
                            { id: 'turirejo', name: 'Turirejo', postalCode: '65215' },
                        ],
                    },
                    {
                        id: 'pakis',
                        name: 'Pakis',
                        subDistricts: [
                            { id: 'asrikaton', name: 'Asrikaton', postalCode: '65154' },
                            { id: 'bunutwetan', name: 'Bunutwetan', postalCode: '65154' },
                            { id: 'kedungrejo', name: 'Kedungrejo', postalCode: '65154' },
                            { id: 'mangliawan', name: 'Mangliawan', postalCode: '65154' },
                            { id: 'pakis', name: 'Pakis', postalCode: '65154' },
                            { id: 'pakiskembar', name: 'Pakiskembar', postalCode: '65154' },
                            { id: 'pakisjajar', name: 'Pakisjajar', postalCode: '65154' },
                            { id: 'saptorenggo', name: 'Saptorenggo', postalCode: '65154' },
                            { id: 'sekarpuro', name: 'Sekarpuro', postalCode: '65154' },
                            { id: 'sukoanyar', name: 'Sukoanyar', postalCode: '65154' },
                            { id: 'sumberkradenan', name: 'Sumberkradenan', postalCode: '65154' },
                            { id: 'sumbersekar', name: 'Sumbersekar', postalCode: '65154' },
                            { id: 'tirtomoyo', name: 'Tirtomoyo', postalCode: '65154' },
                            { id: 'ampeldento', name: 'Ampeldento', postalCode: '65154' },
                        ],
                    },
                    {
                        id: 'bululawang',
                        name: 'Bululawang',
                        subDistricts: [
                            { id: 'bakalan', name: 'Bakalan', postalCode: '65171' },
                            { id: 'bululawang', name: 'Bululawang', postalCode: '65171' },
                            { id: 'gading', name: 'Gading', postalCode: '65171' },
                            { id: 'kasembon', name: 'Kasembon', postalCode: '65171' },
                            { id: 'krebet', name: 'Krebet', postalCode: '65171' },
                            { id: 'kuwolu', name: 'Kuwolu', postalCode: '65171' },
                            { id: 'lumbangsari', name: 'Lumbangsari', postalCode: '65171' },
                            { id: 'pringu', name: 'Pringu', postalCode: '65171' },
                            { id: 'sudimoro', name: 'Sudimoro', postalCode: '65171' },
                            { id: 'sukonolo', name: 'Sukonolo', postalCode: '65171' },
                            { id: 'wandanpuro', name: 'Wandanpuro', postalCode: '65171' },
                            { id: 'kasri', name: 'Kasri', postalCode: '65171' },
                            { id: 'sentong', name: 'Sentong', postalCode: '65171' },
                            { id: 'krebet-senggrong', name: 'Krebet Senggrong', postalCode: '65171' },
                        ],
                    },
                    {
                        id: 'tumpang',
                        name: 'Tumpang',
                        subDistricts: [
                            { id: 'bokor', name: 'Bokor', postalCode: '65156' },
                            { id: 'duwet', name: 'Duwet', postalCode: '65156' },
                            { id: 'duwetkrajan', name: 'Duwetkrajan', postalCode: '65156' },
                            { id: 'jeru', name: 'Jeru', postalCode: '65156' },
                            { id: 'kidal', name: 'Kidal', postalCode: '65156' },
                            { id: 'malangsuko', name: 'Malangsuko', postalCode: '65156' },
                            { id: 'ngadas', name: 'Ngadas', postalCode: '65156' },
                            { id: 'pulungdowo', name: 'Pulungdowo', postalCode: '65156' },
                            { id: 'pandanajeng', name: 'Pandanajeng', postalCode: '65156' },
                            { id: 'tumpang', name: 'Tumpang', postalCode: '65156' },
                            { id: 'tulusbesar', name: 'Tulusbesar', postalCode: '65156' },
                            { id: 'wringinsongo', name: 'Wringinsongo', postalCode: '65156' },
                        ],
                    },
                    {
                        id: 'dau',
                        name: 'Dau',
                        subDistricts: [
                            { id: 'dadapan', name: 'Dadapan', postalCode: '65151' },
                            { id: 'gading-kembar', name: 'Gading Kembar', postalCode: '65151' },
                            { id: 'jetis', name: 'Jetis', postalCode: '65151' },
                            { id: 'karangwidoro', name: 'Karangwidoro', postalCode: '65151' },
                            { id: 'kucur', name: 'Kucur', postalCode: '65151' },
                            { id: 'landungsari', name: 'Landungsari', postalCode: '65151' },
                            { id: 'mulyoagung', name: 'Mulyoagung', postalCode: '65151' },
                            { id: 'petungsewu', name: 'Petungsewu', postalCode: '65151' },
                            { id: 'selorejo', name: 'Selorejo', postalCode: '65151' },
                            { id: 'tegalweru', name: 'Tegalweru', postalCode: '65151' },
                        ],
                    },
                    {
                        id: 'wagir',
                        name: 'Wagir',
                        subDistricts: [
                            { id: 'dalisodo', name: 'Dalisodo', postalCode: '65158' },
                            { id: 'gondowangi', name: 'Gondowangi', postalCode: '65158' },
                            { id: 'jedong', name: 'Jedong', postalCode: '65158' },
                            { id: 'mendalanwangi', name: 'Mendalanwangi', postalCode: '65158' },
                            { id: 'pandanlandung', name: 'Pandanlandung', postalCode: '65158' },
                            { id: 'pandanrejo', name: 'Pandanrejo', postalCode: '65158' },
                            { id: 'parangargo', name: 'Parangargo', postalCode: '65158' },
                            { id: 'petungsewu', name: 'Petungsewu', postalCode: '65158' },
                            { id: 'sidorahayu', name: 'Sidorahayu', postalCode: '65158' },
                            { id: 'sitirejo', name: 'Sitirejo', postalCode: '65158' },
                            { id: 'sukodadi', name: 'Sukodadi', postalCode: '65158' },
                            { id: 'sumbersekar', name: 'Sumbersekar', postalCode: '65158' },
                        ],
                    },
                ],
            },
            {
                id: 'kota-malang',
                name: 'Kota Malang',
                districts: [
                    {
                        id: 'klojen',
                        name: 'Klojen',
                        subDistricts: [
                            { id: 'bareng', name: 'Bareng', postalCode: '65116' },
                            { id: 'gadingkasri', name: 'Gadingkasri', postalCode: '65115' },
                            { id: 'kasin', name: 'Kasin', postalCode: '65117' },
                            { id: 'kauman', name: 'Kauman', postalCode: '65119' },
                            { id: 'kiduldalem', name: 'Kiduldalem', postalCode: '65118' },
                            { id: 'klojen', name: 'Klojen', postalCode: '65111' },
                            { id: 'orooro-dowo', name: 'Oro-oro Dowo', postalCode: '65112' },
                            { id: 'penanggungan', name: 'Penanggungan', postalCode: '65113' },
                            { id: 'rampal-celaket', name: 'Rampal Celaket', postalCode: '65111' },
                            { id: 'samaan', name: 'Samaan', postalCode: '65112' },
                            { id: 'sukoharjo', name: 'Sukoharjo', postalCode: '65118' },
                        ],
                    },
                    {
                        id: 'lowokwaru',
                        name: 'Lowokwaru',
                        subDistricts: [
                            { id: 'dinoyo', name: 'Dinoyo', postalCode: '65144' },
                            { id: 'jatimulyo', name: 'Jatimulyo', postalCode: '65141' },
                            { id: 'ketawanggede', name: 'Ketawanggede', postalCode: '65145' },
                            { id: 'lowokwaru', name: 'Lowokwaru', postalCode: '65141' },
                            { id: 'merjosari', name: 'Merjosari', postalCode: '65144' },
                            { id: 'mojolangu', name: 'Mojolangu', postalCode: '65143' },
                            { id: 'sumbersari', name: 'Sumbersari', postalCode: '65145' },
                            { id: 'tasikmadu', name: 'Tasikmadu', postalCode: '65143' },
                            { id: 'tlogomas', name: 'Tlogomas', postalCode: '65144' },
                            { id: 'tulusrejo', name: 'Tulusrejo', postalCode: '65141' },
                            { id: 'tunggulwulung', name: 'Tunggulwulung', postalCode: '65143' },
                            { id: 'tunjungsekar', name: 'Tunjungsekar', postalCode: '65142' },
                        ],
                    },
                    {
                        id: 'blimbing',
                        name: 'Blimbing',
                        subDistricts: [
                            { id: 'arjosari', name: 'Arjosari', postalCode: '65126' },
                            { id: 'balearjosari', name: 'Balearjosari', postalCode: '65126' },
                            { id: 'blimbing', name: 'Blimbing', postalCode: '65125' },
                            { id: 'bunulrejo', name: 'Bunulrejo', postalCode: '65123' },
                            { id: 'jodipan', name: 'Jodipan', postalCode: '65121' },
                            { id: 'kesatrian', name: 'Kesatrian', postalCode: '65124' },
                            { id: 'pandanwangi', name: 'Pandanwangi', postalCode: '65126' },
                            { id: 'polehan', name: 'Polehan', postalCode: '65122' },
                            { id: 'polowijen', name: 'Polowijen', postalCode: '65126' },
                            { id: 'purwodadi', name: 'Purwodadi', postalCode: '65125' },
                            { id: 'purwantoro', name: 'Purwantoro', postalCode: '65122' },
                        ],
                    },
                    {
                        id: 'sukun',
                        name: 'Sukun',
                        subDistricts: [
                            { id: 'bakalan-krajan', name: 'Bakalan Krajan', postalCode: '65148' },
                            { id: 'bandungrejosari', name: 'Bandungrejosari', postalCode: '65148' },
                            { id: 'bandulan', name: 'Bandulan', postalCode: '65146' },
                            { id: 'ciptomulyo', name: 'Ciptomulyo', postalCode: '65148' },
                            { id: 'gadang', name: 'Gadang', postalCode: '65149' },
                            { id: 'karangbesuki', name: 'Karangbesuki', postalCode: '65146' },
                            { id: 'kebonsari', name: 'Kebonsari', postalCode: '65149' },
                            { id: 'mulyorejo', name: 'Mulyorejo', postalCode: '65147' },
                            { id: 'pisangcandi', name: 'Pisangcandi', postalCode: '65146' },
                            { id: 'sukun', name: 'Sukun', postalCode: '65147' },
                            { id: 'tanjungrejo', name: 'Tanjungrejo', postalCode: '65148' },
                        ],
                    },
                    {
                        id: 'kedungkandang',
                        name: 'Kedungkandang',
                        subDistricts: [
                            { id: 'arjowinangun', name: 'Arjowinangun', postalCode: '65132' },
                            { id: 'bumiayu', name: 'Bumiayu', postalCode: '65135' },
                            { id: 'buring', name: 'Buring', postalCode: '65136' },
                            { id: 'cemorokandang', name: 'Cemorokandang', postalCode: '65138' },
                            { id: 'kedungkandang', name: 'Kedungkandang', postalCode: '65135' },
                            { id: 'kotalama', name: 'Kotalama', postalCode: '65136' },
                            { id: 'lesanpuro', name: 'Lesanpuro', postalCode: '65136' },
                            { id: 'madyopuro', name: 'Madyopuro', postalCode: '65139' },
                            { id: 'mergosono', name: 'Mergosono', postalCode: '65133' },
                            { id: 'sawojajar', name: 'Sawojajar', postalCode: '65139' },
                            { id: 'tlogowaru', name: 'Tlogowaru', postalCode: '65137' },
                            { id: 'wonokoyo', name: 'Wonokoyo', postalCode: '65138' },
                        ],
                    },
                ],
            },
        ],
    },
];

// Helper functions
export const getProvinces = () => regions;

export const getCities = (provinceId: string) => {
    const province = regions.find((p) => p.id === provinceId);
    return province?.cities || [];
};

export const getDistricts = (provinceId: string, cityId: string) => {
    const city = getCities(provinceId).find((c) => c.id === cityId);
    return city?.districts || [];
};

export const getSubDistricts = (
    provinceId: string,
    cityId: string,
    districtId: string
) => {
    const district = getDistricts(provinceId, cityId).find(
        (d) => d.id === districtId
    );
    return district?.subDistricts || [];
};

export const getPostalCode = (
    provinceId: string,
    cityId: string,
    districtId: string,
    subDistrictId: string
) => {
    const subDistrict = getSubDistricts(provinceId, cityId, districtId).find(
        (s) => s.id === subDistrictId
    );
    return subDistrict?.postalCode || '';
};

// Get display names
export const getProvinceName = (id: string) =>
    regions.find((p) => p.id === id)?.name || '';

export const getCityName = (provinceId: string, cityId: string) =>
    getCities(provinceId).find((c) => c.id === cityId)?.name || '';

export const getDistrictName = (
    provinceId: string,
    cityId: string,
    districtId: string
) =>
    getDistricts(provinceId, cityId).find((d) => d.id === districtId)?.name || '';

export const getSubDistrictName = (
    provinceId: string,
    cityId: string,
    districtId: string,
    subDistrictId: string
) =>
    getSubDistricts(provinceId, cityId, districtId).find(
        (s) => s.id === subDistrictId
    )?.name || '';
