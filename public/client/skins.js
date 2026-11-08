import { config } from "./config.js";

// Live arras.io name-skin table (226 entries).
const names = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua",
    "Arab Emirates", "Arab League", "Argentina", "Armenia", "arras", "Aruba",
    "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh",
    "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
    "Bolivia", "Bonaire", "Bosnia", "Botswana", "Brazil", "Brunei",
    "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
    "Cape Verde", "Central-Africa", "Chad", "Chile", "China", "Colombia",
    "Comoros", "Congo", "Congo Republic", "Costa Rica", "Cote d' Ivoire", "Croatia",
    "Cuba", "Curacao", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
    "Dominican Republic", "Dominica", "East Timor", "Ecuador", "Egypt", "El Salvador",
    "England", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Europe",
    "Faroe", "Fiji", "Finland", "France", "Gabon", "Gambia",
    "Georgia", "Germany", "Ghana", "Greece", "Greenland", "Grenada",
    "Grenadines", "Guadeloupe", "Guam", "Guatemala", "Guinea-Bissau", "Guinea",
    "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland",
    "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
    "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
    "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
    "Lebanon", "Lesotho", "lgbtq", "Liberia", "Libya", "Liechtenstein",
    "Lithuania", "Luxembourg", "Macao", "Madagascar", "Malawi", "Malaysia",
    "Maldives", "Mali", "Malta", "Mariana", "Marshall", "Mauritania",
    "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
    "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru",
    "Nepal", "Netherlands", "Nevis", "New Caledonia", "New Zealand", "Nicaragua",
    "Nigeria", "Niger", "Niue", "Northern Ireland", "North Korea", "North Macedonia",
    "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
    "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Puerto Rico", "Qatar", "Romania", "Russia", "Rwanda", "Saba",
    "Saint Lucia", "Saint Patrick", "Samoa", "San Marino", "Sao Tome", "São Tomé",
    "Saudi Arabia", "Scotland", "Senegal", "Serbia", "Seychelles", "Sierra Leone",
    "Singapore", "Slovakia", "Slovenia", "Solomon", "Somalia", "South Africa",
    "South Korea", "South Sudan", "Spain", "Sri Lanka", "St. Eustatius", "St. Martin",
    "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga",
    "trans", "Trinidad", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "UAE", "Uganda", "UK", "Ukraine", "Uruguay", "USSR",
    "USA", "Uzbekistan", "Vanuatu", "Vatican", "Venezuela", "Vietnam",
    "Wales", "Yemen", "Zambia", "Zimbabwe",
];

const keywords = names.map((name) => [name, name.toLowerCase()]);
const cache = new Map();

function findSkinKeyword(rawName) {
    const name = (rawName || "").replace(/^#[0-9a-f]{6}/i, "").toLowerCase();
    if (!name) return null;
    if (cache.has(name)) return cache.get(name);
    let best = null;
    let at = -1;
    for (const [skin, keyword] of keywords) {
        const index = name.lastIndexOf(keyword);
        if (index > at) {
            best = skin;
            at = index;
        }
    }
    cache.set(name, best);
    return best;
}

export function skinShape(rawName) {
    if (!config.graphical.renderSkins) return null;
    const name = findSkinKeyword(rawName);
    return name ? `image=/skins/${encodeURIComponent(name)}.png` : null;
}
