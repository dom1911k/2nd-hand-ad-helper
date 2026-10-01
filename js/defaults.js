// Starter data. Everything here is editable in the app (Blocks / Settings tabs).

const CONDITION_OPTIONS = ['Neu', 'Wie neu', 'Sehr gut', 'Gut', 'Akzeptabel', 'Defekt / für Bastler'];

const conditionFields = [
  { key: 'condition', label: 'Condition', options: CONDITION_OPTIONS },
  { key: 'defects', label: 'Scratches / defects (empty = none)', options: [] },
];

export function defaultState() {
  return {
    version: 1,
    globals: {
      city: '',
    },
    platforms: {
      ebay: {
        name: 'eBay',
        postUrl: 'https://www.ebay.de/sl/sell',
        titleMax: 80,
        markupPct: 0,
      },
      kleinanzeigen: {
        name: 'Kleinanzeigen',
        postUrl: 'https://www.kleinanzeigen.de/p-anzeige-aufgeben.html',
        titleMax: 65,
        markupPct: 0,
      },
      vinted: {
        name: 'Vinted',
        postUrl: 'https://www.vinted.de/items/new',
        titleMax: null,
        markupPct: 0,
      },
      willhaben: {
        name: 'Willhaben',
        postUrl: 'https://www.willhaben.at/iad/anzeigenaufgabe',
        titleMax: null,
        markupPct: 0,
      },
    },
    accounts: [
      { id: 'ebay-1', platform: 'ebay', name: 'eBay 1' },
      { id: 'ebay-2', platform: 'ebay', name: 'eBay 2' },
      { id: 'ebay-3', platform: 'ebay', name: 'eBay 3' },
      { id: 'ka-1', platform: 'kleinanzeigen', name: 'Kleinanzeigen 1' },
      { id: 'ka-2', platform: 'kleinanzeigen', name: 'Kleinanzeigen 2' },
      { id: 'vinted-1', platform: 'vinted', name: 'Vinted' },
      { id: 'wh-1', platform: 'willhaben', name: 'Willhaben' },
    ],
    blocks: [
      // ---- 3DS
      {
        id: '3ds-japan',
        name: '3DS: from Japan',
        text: 'Japanischer Nintendo {model}[[ in {color}]]. Das Gerät stammt direkt aus Japan.',
        platforms: [],
      },
      {
        id: '3ds-cfw',
        name: '3DS: region-free via CFW',
        text:
          'Die Konsole wurde per Custom Firmware region-free gemacht – Spiele aus Europa, Japan und den USA laufen darauf.',
        platforms: [],
      },
      {
        id: '3ds-menu-jp',
        name: '3DS: system menu Japanese',
        text: 'Hinweis: Das Systemmenü der Konsole ist auf Japanisch.',
        platforms: [],
      },
      {
        id: '3ds-sd',
        name: '3DS: SD card',
        text: 'Inklusive {sd_size} GB SD-Karte.',
        platforms: [],
      },
      // ---- iPod
      {
        id: 'ipod-intro',
        name: 'iPod: intro',
        text: 'Apple iPod {model}[[ in {color}]][[ mit {capacity}]].',
        platforms: [],
      },
      {
        id: 'ipod-storage',
        name: 'iPod: storage',
        text: 'Speicher: {storage}',
        platforms: [],
      },
      {
        id: 'ipod-battery',
        name: 'iPod: battery',
        text: 'Akku: {battery}',
        platforms: [],
      },
      // ---- PS Vita memory card
      {
        id: 'vita-intro',
        name: 'Vita card: intro',
        text: 'Original Sony PS Vita Speicherkarte mit {capacity} GB[[, {packaging}]].',
        platforms: [],
      },
      {
        id: 'vita-compat',
        name: 'Vita card: compatibility',
        text: 'Passend für die PS Vita (PCH-1000 und PCH-2000) sowie den PS TV.',
        platforms: [],
      },
      {
        id: 'multi-stock',
        name: 'Several in stock',
        text: 'Mehrere Exemplare verfügbar – bei Interesse an mehreren Stück einfach melden.',
        platforms: [],
      },
      // ---- shared
      {
        id: 'accessories',
        name: 'Accessories',
        text: 'Lieferumfang: {accessories}',
        platforms: [],
      },
      {
        id: 'extra',
        name: 'Free text (per item)',
        text: '{extra}',
        platforms: [],
      },
      {
        id: 'condition',
        name: 'Condition',
        text: 'Zustand: {condition}',
        platforms: [],
      },
      {
        id: 'defects',
        name: 'Defects / scratches',
        text: 'Gebrauchsspuren / Mängel: {defects} (siehe Fotos).',
        platforms: [],
      },
      {
        id: 'shipping',
        name: 'Shipping',
        text: 'Versand als versichertes Paket[[ oder Abholung in {city}]]. Bei Fragen gerne melden!',
        platforms: [],
      },
      {
        id: 'warranty-de',
        name: 'Warranty exclusion (DE, private)',
        text:
          'Privatverkauf: Der Verkauf erfolgt unter Ausschluss jeglicher Sachmängelhaftung. Keine Garantie, keine Rücknahme. ' +
          'Die Haftung für Schäden aus der Verletzung von Leben, Körper oder Gesundheit sowie für Vorsatz und grobe Fahrlässigkeit bleibt unberührt.',
        platforms: ['ebay', 'kleinanzeigen', 'vinted'],
      },
      {
        id: 'warranty-at',
        name: 'Warranty exclusion (AT, private)',
        text: 'Privatverkauf: Die Gewährleistung wird ausgeschlossen. Keine Garantie, keine Rücknahme.',
        platforms: ['willhaben'],
      },
    ],
    productTypes: [
      {
        id: '3ds',
        name: 'Nintendo 3DS (JP)',
        fields: [
          { key: 'model', label: 'Model', options: ['New 3DS XL', 'New 3DS', '3DS XL', '3DS', 'New 2DS XL', '2DS'] },
          { key: 'color', label: 'Colour', options: [] },
          { key: 'sd_size', label: 'SD card (GB, empty = none)', options: ['16', '32', '64', '128'] },
          { key: 'accessories', label: 'Accessories', options: [] },
          ...conditionFields,
        ],
        titles: {
          default: 'Nintendo {model}[[ {color}]] – Japan, Region Free[[, {sd_size} GB SD]]',
        },
        blocks: [
          { blockId: '3ds-japan', on: true },
          { blockId: '3ds-cfw', on: true },
          { blockId: '3ds-menu-jp', on: false },
          { blockId: '3ds-sd', on: true },
          { blockId: 'accessories', on: true },
          { blockId: 'extra', on: true },
          { blockId: 'condition', on: true },
          { blockId: 'defects', on: true },
          { blockId: 'shipping', on: true },
          { blockId: 'warranty-de', on: true },
          { blockId: 'warranty-at', on: true },
        ],
        defaults: { model: 'New 3DS XL', sd_size: '32', condition: 'Sehr gut' },
      },
      {
        id: 'ipod',
        name: 'Apple iPod',
        fields: [
          {
            key: 'model',
            label: 'Model',
            options: ['Classic 7G', 'Classic 6.5G', 'Classic 6G', 'Video 5.5G', 'Video 5G', 'Nano 7G', 'Nano 6G', 'Mini'],
          },
          { key: 'capacity', label: 'Capacity (e.g. 128 GB)', options: [] },
          { key: 'color', label: 'Colour', options: ['Silber', 'Schwarz', 'Weiß'] },
          {
            key: 'storage',
            label: 'Storage',
            options: ['Original-Festplatte', 'iFlash-Umbau auf SD-Speicher (leise, stoßfest)'],
          },
          { key: 'battery', label: 'Battery', options: ['neu eingebaut', 'original'] },
          { key: 'accessories', label: 'Accessories', options: [] },
          ...conditionFields,
        ],
        titles: {
          default: 'Apple iPod {model}[[ {capacity}]][[ {color}]]',
        },
        blocks: [
          { blockId: 'ipod-intro', on: true },
          { blockId: 'ipod-storage', on: true },
          { blockId: 'ipod-battery', on: true },
          { blockId: 'accessories', on: true },
          { blockId: 'extra', on: true },
          { blockId: 'condition', on: true },
          { blockId: 'defects', on: true },
          { blockId: 'shipping', on: true },
          { blockId: 'warranty-de', on: true },
          { blockId: 'warranty-at', on: true },
        ],
        defaults: { model: 'Classic 7G', color: 'Silber', condition: 'Sehr gut' },
      },
      {
        id: 'vita-card',
        name: 'PS Vita memory card',
        fields: [
          { key: 'capacity', label: 'Capacity (GB)', options: ['8', '16', '32', '64'] },
          { key: 'packaging', label: 'Packaging', options: ['in Originalverpackung', 'ohne Verpackung'] },
          ...conditionFields,
        ],
        titles: {
          default: 'PS Vita Speicherkarte {capacity} GB – Original Sony',
        },
        blocks: [
          { blockId: 'vita-intro', on: true },
          { blockId: 'vita-compat', on: true },
          { blockId: 'multi-stock', on: false },
          { blockId: 'extra', on: true },
          { blockId: 'condition', on: true },
          { blockId: 'defects', on: true },
          { blockId: 'shipping', on: true },
          { blockId: 'warranty-de', on: true },
          { blockId: 'warranty-at', on: true },
        ],
        defaults: { capacity: '64', condition: 'Sehr gut' },
      },
    ],
    items: [],
  };
}
