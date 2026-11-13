import type { Exercise } from '@/domain';

const comparable = (name: string) => name.trim().toLocaleLowerCase();

/**
 * The exercise that already goes by this name, if any: two exercises of one name could not be
 * told apart in the form or the journal. Case and spaces at the ends do not count.
 *
 * @param display what each exercise is called on screen (built-in ones in the current language)
 * @param exceptId the exercise being renamed, which may keep its own name
 */
export function namesakeOf(
  name: string,
  exercises: readonly Exercise[],
  display: (exercise: Exercise) => string,
  exceptId?: string,
): Exercise | undefined {
  const wanted = comparable(name);
  return exercises.find((exercise) => exercise.id !== exceptId && comparable(display(exercise)) === wanted);
}
