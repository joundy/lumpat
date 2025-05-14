/**
 * Trie-based permutation generator with backtrack filling algorithm
 * Adapted from Lua hop extension https://github.com/hadronized/hop.nvim/blob/master/lua/hop/perm.lua
 */

/**
 * Get the first key of a key set
 * @param {string[]} keys - Array of characters
 * @returns {string} The first key
 */
function firstKey(keys: string[]): string {
  return keys[0];
}

/**
 * Get the next key of the input key in the input key set, if any, or return null
 * @param {string[]} keys - Array of characters
 * @param {string} key - Current key
 * @returns {string|null} The next key or null if at the end
 */
function nextKey(keys: string[], key: string): string | null {
  const index = keys.indexOf(key);
  if (index === keys.length - 1) {
    return null;
  }
  return keys[index + 1];
}

interface TrieNode {
  key: string;
  trie: TrieNode[];
}

interface PermMethod {
  permutations(keys: string[], n: number): string[][];
}

/**
 * Trie-based permutation generator with backtrack filling
 */
class TrieBacktrackFilling implements PermMethod {
  /**
   * Get the sequence encoded in a trie by a pointer
   * @param {TrieNode[]} trie - The trie structure
   * @param {number[]} p - Pointer in the trie
   * @returns {string[]} The sequence
   */
  lookupSeqTrie(trie: TrieNode[], p: number[]): string[] {
    const seq: string[] = [];
    let t: TrieNode[] = trie;
    for (const i of p) {
      const currentTrie = t[i];
      seq.push(currentTrie.key);
      t = currentTrie.trie;
    }
    seq.push(t[t.length - 1].key);
    return seq;
  }

  /**
   * Add a new permutation to the trie at the current pointer by adding a key
   * @param {TrieNode[]} trie - The trie structure
   * @param {number[]} p - Pointer in the trie
   * @param {string} key - Key to add
   * @returns {TrieNode[]} The updated trie
   */
  addTrieKey(trie: TrieNode[], p: number[], key: string): TrieNode[] {
    let t: TrieNode[] = trie;
    // Find the parent trie
    for (const i of p) {
      const currentTrie = t[i];
      t = currentTrie.trie;
    }
    t.push({ key, trie: [] });
    return trie;
  }

  /**
   * Maintain a trie pointer of a given dimension
   * @param {number} depth - Maximum depth
   * @param {number} n - Default value for new dimensions
   * @param {number[]} p - Current pointer
   * @returns {number[]} Updated pointer
   */
  maintainDeepPointer(depth: number, n: number, p: number[]): number[] {
    const q = [...p];
    for (let i = p.length; i < depth; i++) {
      q[i] = n;
    }
    return q;
  }

  /**
   * Generate the next permutation with backtrack filling
   * @param {string[]} keys - Input key set
   * @param {TrieNode[]} trie - Trie representing all already generated permutations
   * @param {number[]} p - Current pointer in the trie
   * @returns {[TrieNode[], number[]]} Updated trie and pointer
   */
  nextPerm(
    keys: string[],
    trie: TrieNode[],
    p: number[]
  ): [TrieNode[], number[]] {
    if (trie.length === 0) {
      return [[{ key: firstKey(keys), trie: [] }], p];
    }
    // Check whether the current sequence can have a next one
    const currentSeq = this.lookupSeqTrie(trie, p);
    const key = nextKey(keys, currentSeq[currentSeq.length - 1]);
    if (key !== null) {
      // We can generate the next permutation by just adding key to the current trie
      this.addTrieKey(trie, p, key);
      return [trie, p];
    } else {
      // We have to backtrack; first, decrement the pointer if possible
      const maxDepth = p.length;
      const keysLen = keys.length;
      let newP = [...p];
      while (newP.length > 0) {
        const lastIndex = newP[newP.length - 1];
        if (lastIndex > 0) {
          newP[newP.length - 1] = lastIndex - 1;
          newP = this.maintainDeepPointer(maxDepth, keysLen - 1, newP);
          // Insert the first key at the new pointer after mutating the one already there
          this.addTrieKey(trie, newP, firstKey(keys));
          this.addTrieKey(trie, newP, nextKey(keys, firstKey(keys))!);
          return [trie, newP];
        } else {
          // We have exhausted all the permutations for the current layer; drop the layer index and try again
          newP.pop();
        }
      }
      // All layers are completely full everywhere; add a new layer at the end
      newP = this.maintainDeepPointer(maxDepth, keysLen - 1, newP);
      newP.push(trie.length - 1); // New layer
      this.addTrieKey(trie, newP, firstKey(keys));
      this.addTrieKey(trie, newP, nextKey(keys, firstKey(keys))!);
      return [trie, newP];
    }
  }

  /**
   * Convert trie to permutations
   * @param {TrieNode} trie - The trie structure
   * @param {string[]} perm - Current permutation
   * @returns {string[][]} List of permutations
   */
  trieToPerms(trie: TrieNode, perm: string[] = []): string[][] {
    let perms: string[][] = [];
    const p = [...perm, trie.key];
    if (trie.trie.length > 0) {
      for (const subTrie of trie.trie) {
        perms = perms.concat(this.trieToPerms(subTrie, p));
      }
    } else {
      perms = [p];
    }
    return perms;
  }

  /**
   * Generate permutations
   * @param {string[]} keys - Input key set
   * @param {number} n - Number of permutations to generate
   * @returns {string[][]} List of permutations
   */
  permutations(keys: string[], n: number): string[][] {
    let perms: string[][] = [];
    let trie: TrieNode[] = [];
    let p: number[] = [];
    for (let i = 0; i < n; i++) {
      [trie, p] = this.nextPerm(keys, trie, p);
    }
    for (const subTrie of trie) {
      perms = perms.concat(this.trieToPerms(subTrie));
    }
    return perms;
  }
}

interface PermutationOptions {
  permMethod?: PermMethod;
}

/**
 * Generate permutations using the specified method
 * @param {string[]} keys - Input key set
 * @param {number} n - Number of permutations to generate
 * @param {PermutationOptions} opts - Options
 * @returns {string[][]} List of permutations
 */
function generatePermutationsWithMethod(
  keys: string[],
  n: number,
  opts: PermutationOptions = {}
): string[][] {
  const permMethod = opts.permMethod || new TrieBacktrackFilling();
  return permMethod.permutations(keys, n);
}

/**
 * Convert array permutations to string permutations
 * @param {string[][]} perms - Array permutations
 * @returns {string[]} String permutations
 */
function permsToStrings(perms: string[][]): string[] {
  return perms.map((perm) => perm.join(""));
}

/**
 * Generate trie-based permutations and convert to strings
 * @param {string[]} keys - Input key set
 * @param {number} n - Number of permutations to generate
 * @returns {string[]} String permutations
 */

// Cache for memoization to avoid recalculating the same permutations
const permutationCache: Record<string, string[]> = {};

export function triePermutations(keys: string[], n: number): string[] {
  // Create a cache key based on the input parameters
  const cacheKey = `${keys.join('')}-${n}`;
  
  // Return cached result if available
  if (permutationCache[cacheKey]) {
    return permutationCache[cacheKey];
  }
  
  const permMethod = new TrieBacktrackFilling();
  const permutations = permMethod.permutations(keys, n);
  const result = permsToStrings(permutations);
  
  // Cache the result for future use
  permutationCache[cacheKey] = result;
  
  return result;
}
