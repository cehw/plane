// Geographic grouping: UN M49, https://unstats.un.org/unsd/methodology/m49/ (2026-11-01).
// Americas split at South America; Central America and Caribbean are in North America.
// TW and XK are display-code supplements. Each source code belongs to one group only.
const continentCodes: Record<string, string> = {
  亚洲: "AE AF AM AZ BD BH BN BT CN CY GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE",
  欧洲: "AD AL AT AX BA BE BG BY CH CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK",
  非洲: "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG ER ET GA GH GM GN GQ GW IO KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW",
  北美洲:
    "AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI",
  南美洲: "AR BO BR CL CO EC FK GF GY PE PY SR UY VE",
  大洋洲: "AS AU CC CK CX FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS",
  南极洲: "AQ",
};
const continentByCode = new Map(
  Object.entries(continentCodes).flatMap(([group, codes]) =>
    codes.split(" ").map((code) => [code, group] as const),
  ),
);
const names = new Intl.DisplayNames(["zh-CN"], { type: "region" });
export type CountryRow = [string, number, number, number];
export function countryName(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? (names.of(code) ?? code) : code;
}
export function countryGroups(rows: CountryRow[], search = "", includeLegacy = false) {
  const query = search.trim().toLocaleLowerCase();
  const groups = [...Object.keys(continentCodes), "未归类"].map((name) => ({
    name,
    rows: [] as CountryRow[],
    recent: 0,
    total: 0,
  }));
  for (const row of rows) {
    const [raw, old, both, fresh] = row;
    const code = raw.toUpperCase();
    const groupName = continentByCode.get(code) ?? "未归类";
    if (
      (!includeLegacy && both + fresh === 0) ||
      !`${code} ${countryName(code)} ${groupName}`.toLocaleLowerCase().includes(query)
    )
      continue;
    const group = groups.find((g) => g.name === groupName)!;
    group.rows.push([code, old, both, fresh]);
    group.recent += both + fresh;
    group.total += old + both + fresh;
  }
  for (const group of groups) {
    // oxlint-disable-next-line unicorn/no-array-sort
    group.rows.sort((a, b) => b[2] + b[3] - (a[2] + a[3]) || a[0].localeCompare(b[0]));
  }
  return groups.filter((g) => g.rows.length > 0);
}
