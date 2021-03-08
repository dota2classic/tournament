import { Column, Entity, PrimaryColumn } from 'typeorm';

export enum TranslationSource {
  TOURNAMENT_NAME = 'TOURNAMENT_NAME',
  TOURNAMENT_DESCRIPTION = 'TOURNAMENT_DESCRIPTION',
}

export enum Lang {
  RU = 'RU',
  EN = 'EN',
}

@Entity()
export class TranslationEntity {
  @PrimaryColumn()
  entityId: number;

  @PrimaryColumn()
  entityType: TranslationSource;

  @PrimaryColumn()
  lang: Lang;

  @Column({ default: ''})
  translation: string;
}
