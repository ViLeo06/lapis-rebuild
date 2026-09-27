import {mkdir, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

export type ReleaseChannel = 'production' | 'preview' | 'ci' | 'local';

export type PublicContentRelease = {
  contentPack: string;
  version: string;
  manifestPath: string;
  fullPackPath: string | null;
};

export type ReleaseMetadata = {
  schema: 1;
  release: {
    channel: ReleaseChannel;
    commit: string | null;
    branch: string | null;
    url: string | null;
  };
  content: PublicContentRelease | null;
};

const TOKEN = /^[A-Za-z0-9._-]{1,128}$/;
const COMMIT = /^[a-f0-9]{7,64}$/;

function optional(env: Record<string, string | undefined>, ...names: string[]): string | null {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

export function publicReleasePath(value: string, label: string): string {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('?') || value.includes('#')) {
    throw new Error(`${label} must be an absolute-path reference on the current public origin`);
  }
  const parts = value.slice(1).split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new Error(`${label} contains an invalid path segment`);
  }
  if (parts.includes('game-data')) {
    throw new Error(`${label} must not point at private game-data`);
  }
  return value;
}

export function publicReleaseReference(value: string, label: string): string {
  if (value.startsWith('/')) return publicReleasePath(value, label);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a same-origin absolute path or clean HTTPS URL`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must be a same-origin absolute path or clean HTTPS URL`);
  }
  if (parsed.pathname.split('/').includes('game-data')) {
    throw new Error(`${label} must not point at private game-data`);
  }
  return parsed.toString();
}

function publicUrl(value: string | null): string | null {
  if (!value) return null;
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('CF_PAGES_URL must be a clean public HTTPS origin URL');
  }
  return parsed.toString();
}

export function buildReleaseMetadata(
  env: Record<string, string | undefined> = process.env,
): ReleaseMetadata {
  const branch = optional(env, 'CF_PAGES_BRANCH', 'GITHUB_HEAD_REF', 'GITHUB_REF_NAME');
  const rawCommit = optional(env, 'CF_PAGES_COMMIT_SHA', 'GITHUB_SHA');
  const commit = rawCommit ? rawCommit.toLowerCase() : null;
  if (commit && !COMMIT.test(commit)) throw new Error('Invalid release commit');

  let channel: ReleaseChannel = 'local';
  if (env.CF_PAGES === '1') channel = branch === 'main' ? 'production' : 'preview';
  else if (env.GITHUB_ACTIONS === 'true') channel = 'ci';

  const contentPack = optional(env, 'LAPIS_PUBLIC_CONTENT_PACK');
  const version = optional(env, 'LAPIS_PUBLIC_CONTENT_VERSION');
  const manifestPath = optional(env, 'LAPIS_PUBLIC_MANIFEST_PATH');
  const fullPackPath = optional(env, 'LAPIS_PUBLIC_FULL_PACK_PATH');
  const hasContentConfig = Boolean(contentPack || version || manifestPath || fullPackPath);

  let content: PublicContentRelease | null = null;
  if (hasContentConfig) {
    if (!contentPack || !version || !manifestPath) {
      throw new Error(
        'Public content release requires LAPIS_PUBLIC_CONTENT_PACK, LAPIS_PUBLIC_CONTENT_VERSION and LAPIS_PUBLIC_MANIFEST_PATH',
      );
    }
    if (!TOKEN.test(contentPack)) throw new Error('Invalid public contentPack');
    if (!TOKEN.test(version)) throw new Error('Invalid public content version');

    const checkedManifestPath = publicReleaseReference(manifestPath, 'LAPIS_PUBLIC_MANIFEST_PATH');
    if (!checkedManifestPath.endsWith('/resource-manifest.json')) {
      throw new Error('LAPIS_PUBLIC_MANIFEST_PATH must end with /resource-manifest.json');
    }

    let checkedFullPackPath: string | null = null;
    if (fullPackPath) {
      checkedFullPackPath = publicReleaseReference(fullPackPath, 'LAPIS_PUBLIC_FULL_PACK_PATH');
      if (!checkedFullPackPath.endsWith('.lapispak')) {
        throw new Error('LAPIS_PUBLIC_FULL_PACK_PATH must end with .lapispak');
      }
    }

    content = {
      contentPack,
      version,
      manifestPath: checkedManifestPath,
      fullPackPath: checkedFullPackPath,
    };
  }

  return {
    schema: 1,
    release: {
      channel,
      commit,
      branch,
      url: publicUrl(optional(env, 'CF_PAGES_URL')),
    },
    content,
  };
}

export async function writeReleaseMetadata(
  outputPath: string,
  env: Record<string, string | undefined> = process.env,
): Promise<ReleaseMetadata> {
  const metadata = buildReleaseMetadata(env);
  await mkdir(dirname(outputPath), {recursive: true});
  await writeFile(outputPath, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  return metadata;
}
