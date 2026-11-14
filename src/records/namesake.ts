const comparable = (name: string) => name.trim().toLocaleLowerCase();

/**
 * The thing that already goes by this name, if any: two exercises or two body parts of one
 * name could not be told apart on screen. Case and spaces at the ends do not count.
 *
 * @param display what each one is called on screen (built-in ones in the current language)
 * @param exceptId the one being renamed, which may keep its own name
 */
export function namesakeOf<Item extends { id: string }>(
  name: string,
  items: readonly Item[],
  display: (item: Item) => string,
  exceptId?: string,
): Item | undefined {
  const wanted = comparable(name);
  return items.find((item) => item.id !== exceptId && comparable(display(item)) === wanted);
}
