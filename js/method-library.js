// Cache parsed libraries and in-flight requests for the lifetime of the page.
export function createMethodLibraryCache(fetchLibrary = fetch) {
  const cache = new Map();

  return function load(file) {
    if (!cache.has(file)) {
      const request = Promise.resolve()
        .then(async () => {
          const response = await fetchLibrary('lib/' + file);
          if (!response.ok) throw new Error('Unable to load method library');
          const data = await response.text();
          return data
            .split('\n')
            .slice(1)
            .filter((line) => line.trim())
            .map((line) => {
              const [name, group, notation] = line.trim().split(/\s+/);
              return { name, notation: group + ' ' + notation };
            });
        })
        .catch((error) => {
          cache.delete(file);
          throw error;
        });
      cache.set(file, request);
    }
    return cache.get(file);
  };
}
