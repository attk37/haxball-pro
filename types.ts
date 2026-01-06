
export interface Team {
  id: string;
  leagueId: string;
  name: string;
  shortName: string;
  color: string;
  secondaryColor: string;
  strength: number; 
}

export interface FormResult {
  matchId: string;
  opponentId: string;
  homeScore: number;
  awayScore: number;
  result: 'G' | 'B' | 'M';
}

export interface Standing {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: FormResult[];
  fanSupport: number; // 0 to 100
}

export enum WeatherType {
  SUNNY = 'SUNNY',
  RAIN = 'RAIN',
  SNOW = 'SNOW'
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  isCompleted: boolean;
  isPlayerMatch: boolean;
  weather: WeatherType;
}

export enum Difficulty {
  EASY = 'KOLAY',
  NORMAL = 'NORMAL',
  HARD = 'ZOR'
}

export interface LeagueState {
  currentWeek: number;
  seasonNumber: number;
  leagueId: string;
  matches: Match[][];
  standings: Standing[];
  playerTeamId: string | null;
  matchDuration: number; // 0 means Unlimited
  targetScore: number | null;
  isGoalieMode: boolean;
  isFireMode?: boolean;
  difficulty: Difficulty;
  trophies: string[]; // Array of league IDs won
}

export enum GameView {
  MENU = 'MENU',
  SETTINGS = 'SETTINGS',
  MANAGER_SETUP = 'MANAGER_SETUP',
  LEAGUE_SELECT = 'LEAGUE_SELECT',
  TEAM_SELECT = 'TEAM_SELECT',
  MULTIPLAYER_SELECT = 'MULTIPLAYER_SELECT',
  DASHBOARD = 'DASHBOARD',
  MATCH = 'MATCH',
  POST_MATCH = 'POST_MATCH',
  SEASON_END = 'SEASON_END',
  TRANSFER_MARKET = 'TRANSFER_MARKET',
  CAREER_PROFILE = 'CAREER_PROFILE'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface PhysicsObject {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  mass: number;
  restitution: number;
  friction: number;
  // Slide Tackle Props
  slideTimer?: number;      // Frames remaining in slide
  slideCooldown?: number;   // Frames until can slide again
  recoveryTimer?: number;   // Frames of penalty (slow movement) after slide
}

export enum PowerUpType {
  SPEED = 'SPEED',
  KICK = 'KICK',
  SIZE = 'SIZE'
}

export interface PowerUpItem {
  id: string;
  type: PowerUpType;
  pos: Vector2;
  radius: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  duration: number; // seconds
}

export interface TransferOffer {
  teamId: string;
  salaryTier: string;
  reason: string;
}

export interface MatchRecordSimple {
  opponentId: string;
  score: string;
}

export interface CareerHistoryStats {
    goalsFor: number;
    goalsAgainst: number;
    wins: number;
    draws: number;
    losses: number;
    biggestWin: MatchRecordSimple | null;
    biggestLoss: MatchRecordSimple | null;
}

export interface CareerHistoryEntry {
  seasonNum: number;
  teamId: string;
  leagueId: string;
  rank: number;
  points: number;
  wonTrophy: boolean;
  stats: CareerHistoryStats;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  condition: (history: CareerHistoryEntry[], stats: any) => boolean;
}

// SKILL TREE TYPES
export type SkillBranch = 'speed' | 'shoot' | 'control' | 'defense';

export interface SkillTreeState {
  levels: {
    speed: number;
    shoot: number;
    control: number;
    defense: number;
  };
  availablePoints: number;
  totalPointsSpent: number;
}
