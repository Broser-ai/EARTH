export type InklingConceptKind = 'select_mission' | 'material_id' | 'route_choice';

export interface InklingConcept {
  id: string;
  kind: InklingConceptKind;
  goal: string;
}

export interface InklingLesson {
  id: string;
  title: string;
  concept: InklingConcept;
  sim: {
    source: 'prime.trajectories';
    minEpisodes: number;
  };
}

export interface InklingWeights {
  uri: string;
  preferredMissionId?: string;
  liveInference: boolean;
}

export const EARTH_DEFAULT_LESSON: InklingLesson = {
  id: 'lesson-prime-mission-select',
  title: 'Select the next sovereign mission',
  concept: {
    id: 'concept-select-mission',
    kind: 'select_mission',
    goal: 'Choose a catalog mission that COMPASS will allow',
  },
  sim: {
    source: 'prime.trajectories',
    minEpisodes: 8,
  },
};
