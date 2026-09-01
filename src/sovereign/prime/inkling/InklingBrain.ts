import type { Trajectory } from '../../types.ts';
import { EARTH_DEFAULT_LESSON, type InklingConceptKind, type InklingLesson } from './types.ts';
import { InklingPolicy } from './InklingPolicy.ts';
import { assertNever } from '../../types.ts';

export class InklingBrain {
  readonly policy: InklingPolicy;
  private lesson: InklingLesson | null = null;
  private readonly episodes: Trajectory[] = [];

  constructor(policy = new InklingPolicy()) {
    this.policy = policy;
  }

  attachLesson(lesson: InklingLesson = EARTH_DEFAULT_LESSON): InklingLesson {
    this.lesson = lesson;
    return lesson;
  }

  currentLesson(): InklingLesson | null {
    return this.lesson;
  }

  observe(trajectory: Trajectory): Trajectory {
    const hooked: Trajectory = {
      ...trajectory,
      lessonId: trajectory.lessonId ?? this.lesson?.id,
    };
    this.episodes.push(hooked);
    return hooked;
  }

  hookedEpisodes(): readonly Trajectory[] {
    return this.episodes;
  }

  trained(): boolean {
    return this.policy.trained;
  }

  conceptKind(): InklingConceptKind | null {
    const kind = this.lesson?.concept.kind;
    if (!kind) return null;
    switch (kind) {
      case 'select_mission':
      case 'material_id':
      case 'route_choice':
        return kind;
      default:
        return assertNever(kind, 'unhandled Inkling concept');
    }
  }
}
