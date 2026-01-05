
import { Team } from './types';

export const LEAGUES = [
  { id: 'tur1', name: 'Trendyol Süper Lig', icon: '🇹🇷', trophyIcon: '🏆', trophyName: 'Süper Lig Kupası' },
  { id: 'eng1', name: 'England Premier League', icon: '🇬🇧', trophyIcon: '🦁', trophyName: 'Premier League Trophy' },
  { id: 'spa1', name: 'Spain LaLiga', icon: '🇪🇸', trophyIcon: '🛡️', trophyName: 'Copa de La Liga' },
  { id: 'ger1', name: 'Germany Bundesliga', icon: '🇩🇪', trophyIcon: '🍽️', trophyName: 'Meisterschale' },
  { id: 'ita1', name: 'Italy Serie A', icon: '🇮🇹', trophyIcon: '🎖️', trophyName: 'Scudetto' },
];

export const ALL_TEAMS: Team[] = [
  // TURKEY SUPER LIG 2024-2025 (Full 19 Teams)
  { id: 'gs', leagueId: 'tur1', name: 'Galatasaray', shortName: 'GS', color: '#A90432', secondaryColor: '#FDB912', strength: 92 },
  { id: 'fb', leagueId: 'tur1', name: 'Fenerbahçe', shortName: 'FB', color: '#003366', secondaryColor: '#FFFF00', strength: 91 },
  { id: 'bjk', leagueId: 'tur1', name: 'Beşiktaş', shortName: 'BJK', color: '#000000', secondaryColor: '#FFFFFF', strength: 89 },
  { id: 'ts', leagueId: 'tur1', name: 'Trabzonspor', shortName: 'TS', color: '#800000', secondaryColor: '#00AEEF', strength: 84 },
  { id: 'ibfk', leagueId: 'tur1', name: 'Başakşehir', shortName: 'IBF', color: '#004A99', secondaryColor: '#ED1C24', strength: 82 },
  { id: 'kas', leagueId: 'tur1', name: 'Kasımpaşa', shortName: 'KAS', color: '#005CAB', secondaryColor: '#FFFFFF', strength: 80 },
  { id: 'siv', leagueId: 'tur1', name: 'Sivasspor', shortName: 'SIV', color: '#ED1C24', secondaryColor: '#FFFFFF', strength: 79 },
  { id: 'ala', leagueId: 'tur1', name: 'Alanyaspor', shortName: 'ALA', color: '#FDB912', secondaryColor: '#009639', strength: 78 },
  { id: 'ant', leagueId: 'tur1', name: 'Antalyaspor', shortName: 'ANT', color: '#ED1C24', secondaryColor: '#FFFFFF', strength: 78 },
  { id: 'riz', leagueId: 'tur1', name: 'Rizespor', shortName: 'RIZ', color: '#008C45', secondaryColor: '#003366', strength: 77 },
  { id: 'gaz', leagueId: 'tur1', name: 'Gaziantep FK', shortName: 'GFK', color: '#ED1C24', secondaryColor: '#000000', strength: 76 },
  { id: 'sam', leagueId: 'tur1', name: 'Samsunspor', shortName: 'SAM', color: '#ED1C24', secondaryColor: '#FFFFFF', strength: 77 },
  { id: 'kay', leagueId: 'tur1', name: 'Kayserispor', shortName: 'KAY', color: '#FDB912', secondaryColor: '#ED1C24', strength: 75 },
  { id: 'hat', leagueId: 'tur1', name: 'Hatayspor', shortName: 'HAT', color: '#800000', secondaryColor: '#FFFFFF', strength: 74 },
  { id: 'kon', leagueId: 'tur1', name: 'Konyaspor', shortName: 'KON', color: '#009639', secondaryColor: '#FFFFFF', strength: 75 },
  { id: 'eye', leagueId: 'tur1', name: 'Eyüpspor', shortName: 'EYE', color: '#6A2A8F', secondaryColor: '#FDB912', strength: 78 },
  { id: 'goz', leagueId: 'tur1', name: 'Göztepe', shortName: 'GOZ', color: '#FDB912', secondaryColor: '#ED1C24', strength: 77 },
  { id: 'bod', leagueId: 'tur1', name: 'Bodrum FK', shortName: 'BOD', color: '#009639', secondaryColor: '#FFFFFF', strength: 73 },
  { id: 'ads', leagueId: 'tur1', name: 'Adana Demirspor', shortName: 'ADS', color: '#00AEEF', secondaryColor: '#003366', strength: 72 },

  // ENGLAND PREMIER LEAGUE (Full 20 Teams)
  { id: 'mci', leagueId: 'eng1', name: 'Man City', shortName: 'MCI', color: '#6CABDD', secondaryColor: '#FFFFFF', strength: 95 },
  { id: 'liv', leagueId: 'eng1', name: 'Liverpool', shortName: 'LIV', color: '#C8102E', secondaryColor: '#FFFFFF', strength: 93 },
  { id: 'ars', leagueId: 'eng1', name: 'Arsenal', shortName: 'ARS', color: '#EF0107', secondaryColor: '#FFFFFF', strength: 92 },
  { id: 'avl', leagueId: 'eng1', name: 'Aston Villa', shortName: 'AVL', color: '#95BFE5', secondaryColor: '#670E36', strength: 86 },
  { id: 'tot', leagueId: 'eng1', name: 'Tottenham', shortName: 'TOT', color: '#132257', secondaryColor: '#FFFFFF', strength: 85 },
  { id: 'che', leagueId: 'eng1', name: 'Chelsea', shortName: 'CHE', color: '#034694', secondaryColor: '#FFFFFF', strength: 86 },
  { id: 'new', leagueId: 'eng1', name: 'Newcastle', shortName: 'NEW', color: '#241F20', secondaryColor: '#FFFFFF', strength: 84 },
  { id: 'mun', leagueId: 'eng1', name: 'Man United', shortName: 'MUN', color: '#DA291C', secondaryColor: '#FFE500', strength: 83 },
  { id: 'whu', leagueId: 'eng1', name: 'West Ham', shortName: 'WHU', color: '#7A263A', secondaryColor: '#1BB1E7', strength: 82 },
  { id: 'cry', leagueId: 'eng1', name: 'Crystal Palace', shortName: 'CRY', color: '#1B458F', secondaryColor: '#C4122E', strength: 81 },
  { id: 'bha', leagueId: 'eng1', name: 'Brighton', shortName: 'BHA', color: '#0057B8', secondaryColor: '#FFFFFF', strength: 82 },
  { id: 'bou', leagueId: 'eng1', name: 'Bournemouth', shortName: 'BOU', color: '#DA291C', secondaryColor: '#000000', strength: 79 },
  { id: 'ful', leagueId: 'eng1', name: 'Fulham', shortName: 'FUL', color: '#FFFFFF', secondaryColor: '#000000', strength: 78 },
  { id: 'wol', leagueId: 'eng1', name: 'Wolves', shortName: 'WOL', color: '#FDB913', secondaryColor: '#231F20', strength: 78 },
  { id: 'eve', leagueId: 'eng1', name: 'Everton', shortName: 'EVE', color: '#003399', secondaryColor: '#FFFFFF', strength: 77 },
  { id: 'bre', leagueId: 'eng1', name: 'Brentford', shortName: 'BRE', color: '#D20000', secondaryColor: '#FFFFFF', strength: 78 },
  { id: 'nfo', leagueId: 'eng1', name: 'Nottm Forest', shortName: 'NFO', color: '#DD0000', secondaryColor: '#FFFFFF', strength: 76 },
  { id: 'lei', leagueId: 'eng1', name: 'Leicester', shortName: 'LEI', color: '#003090', secondaryColor: '#FDBE11', strength: 75 },
  { id: 'ips', leagueId: 'eng1', name: 'Ipswich Town', shortName: 'IPS', color: '#0000FF', secondaryColor: '#FFFFFF', strength: 73 },
  { id: 'sou', leagueId: 'eng1', name: 'Southampton', shortName: 'SOU', color: '#D71920', secondaryColor: '#FFFFFF', strength: 74 },

  // SPAIN LALIGA (Full 20 Teams)
  { id: 'rma', leagueId: 'spa1', name: 'Real Madrid', shortName: 'RMA', color: '#FFFFFF', secondaryColor: '#FEBE10', strength: 96 },
  { id: 'bar', leagueId: 'spa1', name: 'Barcelona', shortName: 'BAR', color: '#004D98', secondaryColor: '#A50044', strength: 94 },
  { id: 'atm', leagueId: 'spa1', name: 'Atlético Madrid', shortName: 'ATM', color: '#CB3524', secondaryColor: '#FFFFFF', strength: 90 },
  { id: 'gir', leagueId: 'spa1', name: 'Girona', shortName: 'GIR', color: '#D31118', secondaryColor: '#FFFFFF', strength: 85 },
  { id: 'ath', leagueId: 'spa1', name: 'Athletic Bilbao', shortName: 'ATH', color: '#EE2523', secondaryColor: '#FFFFFF', strength: 84 },
  { id: 'rso', leagueId: 'spa1', name: 'Real Sociedad', shortName: 'RSO', color: '#0067B1', secondaryColor: '#FFFFFF', strength: 83 },
  { id: 'bet', leagueId: 'spa1', name: 'Real Betis', shortName: 'BET', color: '#009639', secondaryColor: '#FFFFFF', strength: 82 },
  { id: 'vil', leagueId: 'spa1', name: 'Villarreal', shortName: 'VIL', color: '#FDB912', secondaryColor: '#005187', strength: 81 },
  { id: 'val', leagueId: 'spa1', name: 'Valencia', shortName: 'VAL', color: '#FFFFFF', secondaryColor: '#000000', strength: 80 },
  { id: 'ala', leagueId: 'spa1', name: 'Alavés', shortName: 'ALA', color: '#005CAB', secondaryColor: '#FFFFFF', strength: 78 },
  { id: 'osa', leagueId: 'spa1', name: 'Osasuna', shortName: 'OSA', color: '#A90432', secondaryColor: '#132257', strength: 79 },
  { id: 'get', leagueId: 'spa1', name: 'Getafe', shortName: 'GET', color: '#005CAB', secondaryColor: '#FFFFFF', strength: 77 },
  { id: 'clt', leagueId: 'spa1', name: 'Celta Vigo', shortName: 'CLT', color: '#87CEEB', secondaryColor: '#FFFFFF', strength: 78 },
  { id: 'sev', leagueId: 'spa1', name: 'Sevilla', shortName: 'SEV', color: '#FFFFFF', secondaryColor: '#C8102E', strength: 81 },
  { id: 'mal', leagueId: 'spa1', name: 'Mallorca', shortName: 'MAL', color: '#ED1C24', secondaryColor: '#000000', strength: 77 },
  { id: 'lpa', leagueId: 'spa1', name: 'Las Palmas', shortName: 'LPA', color: '#FDB912', secondaryColor: '#005CAB', strength: 76 },
  { id: 'ray', leagueId: 'spa1', name: 'Rayo Vallecano', shortName: 'RAY', color: '#FFFFFF', secondaryColor: '#ED1C24', strength: 75 },
  { id: 'leg', leagueId: 'spa1', name: 'Leganés', shortName: 'LEG', color: '#005CAB', secondaryColor: '#FFFFFF', strength: 74 },
  { id: 'vld', leagueId: 'spa1', name: 'Valladolid', shortName: 'VLD', color: '#6A2A8F', secondaryColor: '#FFFFFF', strength: 73 },
  { id: 'esp', leagueId: 'spa1', name: 'Espanyol', shortName: 'ESP', color: '#005CAB', secondaryColor: '#FFFFFF', strength: 74 },

  // ITALY SERIE A (Full 20 Teams)
  { id: 'int', leagueId: 'ita1', name: 'Inter Milan', shortName: 'INT', color: '#0066B2', secondaryColor: '#000000', strength: 95 },
  { id: 'mil', leagueId: 'ita1', name: 'AC Milan', shortName: 'ACM', color: '#FB090B', secondaryColor: '#000000', strength: 91 },
  { id: 'juv', leagueId: 'ita1', name: 'Juventus', shortName: 'JUV', color: '#FFFFFF', secondaryColor: '#000000', strength: 90 },
  { id: 'ata', leagueId: 'ita1', name: 'Atalanta', shortName: 'ATA', color: '#0066B2', secondaryColor: '#000000', strength: 88 },
  { id: 'nap', leagueId: 'ita1', name: 'Napoli', shortName: 'NAP', color: '#0096D7', secondaryColor: '#FFFFFF', strength: 87 },
  { id: 'rom', leagueId: 'ita1', name: 'AS Roma', shortName: 'ROM', color: '#8E1F2F', secondaryColor: '#F0BC42', strength: 86 },
  { id: 'laz', leagueId: 'ita1', name: 'Lazio', shortName: 'LAZ', color: '#87CEEB', secondaryColor: '#FFFFFF', strength: 84 },
  { id: 'fio', leagueId: 'ita1', name: 'Fiorentina', shortName: 'FIO', color: '#4B2E83', secondaryColor: '#FFFFFF', strength: 83 },
  { id: 'bol', leagueId: 'ita1', name: 'Bologna', shortName: 'BOL', color: '#A90432', secondaryColor: '#132257', strength: 84 },
  { id: 'tor', leagueId: 'ita1', name: 'Torino', shortName: 'TOR', color: '#8B0000', secondaryColor: '#FFFFFF', strength: 81 },
  { id: 'gen', leagueId: 'ita1', name: 'Genoa', shortName: 'GEN', color: '#A90432', secondaryColor: '#132257', strength: 79 },
  { id: 'mon', leagueId: 'ita1', name: 'Monza', shortName: 'MON', color: '#ED1C24', secondaryColor: '#FFFFFF', strength: 78 },
  { id: 'ver', leagueId: 'ita1', name: 'Verona', shortName: 'VER', color: '#003366', secondaryColor: '#FFFF00', strength: 77 },
  { id: 'lec', leagueId: 'ita1', name: 'Lecce', shortName: 'LEC', color: '#FFFF00', secondaryColor: '#ED1C24', strength: 76 },
  { id: 'udi', leagueId: 'ita1', name: 'Udinese', shortName: 'UDI', color: '#FFFFFF', secondaryColor: '#000000', strength: 77 },
  { id: 'cag', leagueId: 'ita1', name: 'Cagliari', shortName: 'CAG', color: '#A90432', secondaryColor: '#132257', strength: 75 },
  { id: 'emp', leagueId: 'ita1', name: 'Empoli', shortName: 'EMP', color: '#005CAB', secondaryColor: '#FFFFFF', strength: 75 },
  { id: 'par', leagueId: 'ita1', name: 'Parma', shortName: 'PAR', color: '#FFFFFF', secondaryColor: '#000000', strength: 76 },
  { id: 'com', leagueId: 'ita1', name: 'Como', shortName: 'COM', color: '#005CAB', secondaryColor: '#FFFFFF', strength: 74 },
  { id: 'ven', leagueId: 'ita1', name: 'Venezia', shortName: 'VEN', color: '#FB6D10', secondaryColor: '#006B3F', strength: 73 },

  // GERMANY BUNDESLIGA (Full 18 Teams)
  { id: 'lev', leagueId: 'ger1', name: 'Leverkusen', shortName: 'B04', color: '#E32221', secondaryColor: '#000000', strength: 94 },
  { id: 'fbc', leagueId: 'ger1', name: 'FC Bayern', shortName: 'FCB', color: '#DC052D', secondaryColor: '#FFFFFF', strength: 93 },
  { id: 'stu', leagueId: 'ger1', name: 'Stuttgart', shortName: 'VFB', color: '#FFFFFF', secondaryColor: '#DC052D', strength: 87 },
  { id: 'rbl', leagueId: 'ger1', name: 'RB Leipzig', shortName: 'RBL', color: '#DD013F', secondaryColor: '#FFFFFF', strength: 89 },
  { id: 'bvb', leagueId: 'ger1', name: 'Dortmund', shortName: 'BVB', color: '#FDE100', secondaryColor: '#000000', strength: 88 },
  { id: 'fra', leagueId: 'ger1', name: 'Frankfurt', shortName: 'SGE', color: '#E1000F', secondaryColor: '#000000', strength: 84 },
  { id: 'hof', leagueId: 'ger1', name: 'Hoffenheim', shortName: 'TSG', color: '#005CA9', secondaryColor: '#FFFFFF', strength: 81 },
  { id: 'hei', leagueId: 'ger1', name: 'Heidenheim', shortName: 'HDH', color: '#ED1C24', secondaryColor: '#004A99', strength: 79 },
  { id: 'bre', leagueId: 'ger1', name: 'Bremen', shortName: 'SVW', color: '#008E4E', secondaryColor: '#FFFFFF', strength: 79 },
  { id: 'fre', leagueId: 'ger1', name: 'Freiburg', shortName: 'SCF', color: '#D11216', secondaryColor: '#FFFFFF', strength: 82 },
  { id: 'aug', leagueId: 'ger1', name: 'Augsburg', shortName: 'FCA', color: '#FFFFFF', secondaryColor: '#008E4E', strength: 78 },
  { id: 'wol', leagueId: 'ger1', name: 'Wolfsburg', shortName: 'WOB', color: '#65B32E', secondaryColor: '#FFFFFF', strength: 80 },
  { id: 'mai', leagueId: 'ger1', name: 'Mainz', shortName: 'M05', color: '#E3000F', secondaryColor: '#FFFFFF', strength: 77 },
  { id: 'mgb', leagueId: 'ger1', name: 'Gladbach', shortName: 'BMG', color: '#FFFFFF', secondaryColor: '#000000', strength: 79 },
  { id: 'unb', leagueId: 'ger1', name: 'Union Berlin', shortName: 'FCU', color: '#ED1C24', secondaryColor: '#FFFFFF', strength: 77 },
  { id: 'boc', leagueId: 'ger1', name: 'Bochum', shortName: 'BOC', color: '#005CA9', secondaryColor: '#FFFFFF', strength: 74 },
  { id: 'stp', leagueId: 'ger1', name: 'St. Pauli', shortName: 'STP', color: '#5D3A24', secondaryColor: '#FFFFFF', strength: 75 },
  { id: 'hks', leagueId: 'ger1', name: 'Holstein Kiel', shortName: 'KSV', color: '#004A99', secondaryColor: '#FFFFFF', strength: 73 },
];

export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 600;
export const PITCH_MARGIN = 60;
export const GOAL_DEPTH = 50;
export const GOAL_SIZE = 140;

export const BALL_RADIUS = 9;
export const PLAYER_RADIUS = 18;
export const PLAYER_SPEED = 0.35;
export const PLAYER_MAX_SPEED = 5;
export const BALL_FRICTION = 0.985;
export const PLAYER_FRICTION = 0.93;
export const BOUNCE = 0.7;
export const KICK_FORCE = 3.85;
