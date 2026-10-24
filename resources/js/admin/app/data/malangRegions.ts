export interface AreaDistrict {
  name: string;
  villages: string[];
}

export interface CityAreaHierarchy {
  city: string;
  districts: AreaDistrict[];
}

export const MALANG_REGIONS_HIERARCHY: CityAreaHierarchy[] = [
  {
    city: 'Kota Malang',
    districts: [
      {
        name: 'Klojen',
        villages: ['Bareng', 'Gadingkasri', 'Kasin', 'Kauman', 'Kiduldalem', 'Klojen', 'Oro-Oro Dowo', 'Penanggungan', 'Rampal Celaket', 'Samaan', 'Sukoharjo']
      },
      {
        name: 'Blimbing',
        villages: ['Arjosari', 'Balearjosari', 'Blimbing', 'Jodipan', 'Kesatrian', 'Pandanwangi', 'Polehan', 'Polowijen', 'Purwantoro', 'Purwodadi']
      },
      {
        name: 'Lowokwaru',
        villages: ['Dinoyo', 'Jatimulyo', 'Ketawanggede', 'Lowokwaru', 'Merjosari', 'Mojolangu', 'Sumbersari', 'Tasikmadu', 'Tlogomas', 'Tulusrejo', 'Tunggulwulung']
      },
      {
        name: 'Sukun',
        villages: ['Bakalankrajan', 'Bandulan', 'Bandungrejosari', 'Ciptomulyo', 'Gadang', 'Karangbesuki', 'Kebonsari', 'Mulyorejo', 'Pisangcandi', 'Sukun', 'Tanjungrejo']
      },
      {
        name: 'Kedungkandang',
        villages: ['Arjowinangun', 'Bumiayu', 'Buring', 'Cemorokandang', 'Kedungkandang', 'Kotalama', 'Lesanpuro', 'Madyopuro', 'Mergosono', 'Sawojajar', 'Tlogowaru', 'Wonokoyo']
      }
    ]
  },
  {
    city: 'Kabupaten Malang',
    districts: [
      {
        name: 'Kepanjen',
        villages: ['Ardirejo', 'Cepokomulyo', 'Curungrejo', 'Dilem', 'Jatirejoyoso', 'Jenggolo', 'Kedungpedaringan', 'Kepanjen', 'Mangunrejo', 'Mojosari', 'Ngadilangkung', 'Panggungrejo', 'Penarukan', 'Sengguruh', 'Sukoraharjo', 'Talangagung', 'Tegalsari']
      },
      {
        name: 'Singosari',
        villages: ['Ardimulyo', 'Banjararum', 'Baturetno', 'Candirenggo', 'Dengkol', 'Gunungrejo', 'Klampok', 'Lang-Lang', 'Losari', 'Pagentan', 'Purwoasri', 'Randuagung', 'Tamanharjo', 'Toyomarto', 'Tunjungtirto', 'Watugede', 'Wonorejo']
      },
      {
        name: 'Lawang',
        villages: ['Bedali', 'Kalirejo', 'Ketindan', 'Lawang', 'Mulyoarjo', 'Sidodadi', 'Srigading', 'Sumberngepoh', 'Sumberporong', 'Turirejo', 'Wonorejo']
      },
      {
        name: 'Dau',
        villages: ['Gadingkulon', 'Kalisongo', 'Karangwidoro', 'Kucur', 'Landungsari', 'Mulyoagung', 'Petungsewu', 'Selorejo', 'Sumbersekar']
      },
      {
        name: 'Pakis',
        villages: ['Ampeldento', 'Asrikaton', 'Banjarejo', 'Bunutwetan', 'Kedungrejo', 'Mangliawan', 'Pakisjajar', 'Pakiskembar', 'Pucangsongo', 'Saptorenggo', 'Sekarpuro', 'Semberkradenan', 'Sumberpasir', 'Tirtomoyo']
      },
      {
        name: 'Karangploso',
        villages: ['Ampeldento', 'Bojonegoro', 'Donowarih', 'Girimoyo', 'Kepuharjo', 'Ngenep', 'Ngijo', 'Tawangargo', 'Tegalgondo']
      },
      {
        name: 'Pujon',
        villages: ['Bendosari', 'Madiredo', 'Ngabab', 'Ngroto', 'Pandansari', 'Pujon Kidul', 'Pujon Lor', 'Sukomulyo', 'Tawangsari', 'Wiyurejo']
      },
      {
        name: 'Turen',
        villages: ['Gedog Kulon', 'Gedog Wetan', 'Jeru', 'Kedok', 'Kemulan', 'Pagentan', 'Sanankerto', 'Sananrejo', 'Sawahan', 'Sedayu', 'Talangsuko', 'Talok', 'Tangkilsari', 'Tanjungsari', 'Tumpukrenteng', 'Turen']
      },
      {
        name: 'Bululawang',
        villages: ['Bakalan', 'Bululawang', 'Gading', 'Kasembon', 'Kasri', 'Krebet', 'Krebet Senggrong', 'Kuasam', 'Lumbangsari', 'Pringu', 'Sempalwadak', 'Sudimoro', 'Sukonolo', 'Wandanpuro']
      },
      {
        name: 'Wagir',
        villages: ['Dalisodo', 'Gondowangi', 'Jedong', 'Mendalanwangi', 'Pandanlandung', 'Pandanrejo', 'Parangargo', 'Petungsewu', 'Sitirejo', 'Sukodadi', 'Sumbersuko']
      }
    ]
  }
];

export const ALL_MALANG_DISTRICTS: string[] = MALANG_REGIONS_HIERARCHY.flatMap((c) =>
  c.districts.map((d) => `${d.name} (${c.city})`)
);
