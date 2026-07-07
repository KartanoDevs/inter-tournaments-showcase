export type CompetitionType = 'MALE' | 'FEMALE';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string | null;
  colorMain?: string | null;
  colorSec?: string | null;
  competitionType: CompetitionType;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
