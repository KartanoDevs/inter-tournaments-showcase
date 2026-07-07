export enum VolleyballPosition {
  SETTER = 'SETTER',
  OUTSIDE_HITTER = 'OUTSIDE_HITTER',
  OPPOSITE = 'OPPOSITE',
  MIDDLE_BLOCKER = 'MIDDLE_BLOCKER',
  LIBERO = 'LIBERO',
  UNIVERSAL = 'UNIVERSAL',
  COACH = 'COACH',
  UNASSIGNED = 'UNASSIGNED',
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string | null;
  number: number;
  position: VolleyballPosition;
  heightCm?: number | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  teamId: string;
  userId?: string | null;
  isActive: boolean;
  isPoke: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
