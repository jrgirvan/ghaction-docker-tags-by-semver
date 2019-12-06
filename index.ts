import * as core from '@actions/core';
import { exec } from '@actions/exec';

import format from 'date-fns/format';

/**
 * Parse and create tags
 *
 * @param semver Semantic version string
 * @param suffix Suffix string to append to trailing of each tags
 * @param additionalTagsStr Comma separated string
 * @returns Array of tags
 */
function parseSemVer(semver: string, suffix: string, additionalTagsStr: string): Array<string> {
  // https://regex101.com/r/sxGQtU/2
  const match: RegExpMatchArray | null = semver.match(/^(v[0-9]+)\.([0-9]+)\.([0-9]+)(-[0-9a-f]*)?$/);
  if (match == null) {
    throw new Error(`Param 'semver' is invalid: ${semver}`);
  }

  const all = match[0];
  const major = match[1];
  const minor = match[2];
  const patch = match[3];
  const rc = match[4];

  core.debug(`all=${all}`);
  core.debug(`major=${major}`);
  core.debug(`minor=${minor}`);
  core.debug(`patch=${patch}`);
  core.debug(`rc=${rc}`);

  const tags: Array<string> = [];

  if (rc != null) {
    tags.push(all);
  }
  else {
    tags.push(`${major}.${minor}.${patch}${suffix}`);
    tags.push(`${major}.${minor}${suffix}`);
    tags.push(`${major}${suffix}`);
  }

  // append additional tags
  additionalTagsStr.split(',').forEach((splitted) => {
    const tag = splitted.trim();
    if (tag.length > 0) {
      tags.push(`${tag}${suffix}`);
    }
  });

  return tags;
}

async function run() {
  try {
    // check docker command
    await exec('docker', ['-v']);

    const source: string = core.getInput('source', { required: true });
    const target: string = core.getInput('target', { required: true });
    const semver: string = core.getInput('semver', { required: true });
    const suffix: string = core.getInput('suffix'); //                    default: ''
    const additionalTagsStr: string = core.getInput('additional-tags') // default: '';
    const isPublish: boolean = core.getInput('publish') === 'true'; //    default: undefined

    // generate tags
    const tags: Array<string> = parseSemVer(semver, suffix, additionalTagsStr);

    for (const tag of tags) {
      const name = `${target}:${tag}`;

      core.debug(`processing '${name}'`);

      // exec 'docker tag'
      await exec('docker', ['tag', source, name]);
      // exec 'docker push
      if (isPublish) {
        await exec('docker', ['push', name]);
      }
    }

    core.setOutput('tags', tags.join(', '));
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run();
