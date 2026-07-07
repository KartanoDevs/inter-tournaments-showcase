import { SponsorRepository } from '../repositories/sponsor.repository';
import { NotFoundError } from '../utils/errors';
import { Prisma } from '@prisma/client';

export class SponsorService {
  constructor(private sponsorRepository: SponsorRepository) {}

  async getAllSponsors() {
    return this.sponsorRepository.findAllActive();
  }

  async getSponsorById(id: string) {
    const sponsor = await this.sponsorRepository.findById(id);
    if (!sponsor) {
      throw new NotFoundError('Patrocinador no encontrado');
    }
    return sponsor;
  }

  async createSponsor(data: Prisma.SponsorCreateInput) {
    return this.sponsorRepository.create(data);
  }

  async updateSponsor(id: string, data: Prisma.SponsorUpdateInput) {
    await this.getSponsorById(id);
    return this.sponsorRepository.update(id, data);
  }

  async deleteSponsor(id: string) {
    await this.getSponsorById(id);
    return this.sponsorRepository.delete(id);
  }
}
