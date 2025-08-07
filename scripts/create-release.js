#!/usr/bin/env node

/**
 * OneKey Hardware JS SDK Release Creator
 * 命令行工具，用于创建完整的 GitHub Release
 */

const { ChangelogGenerator } = require('./changelog-generator.js');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
OneKey Hardware JS SDK Release Creator

Usage:
  node scripts/create-release.js <tag_name> [options]

Arguments:
  tag_name          Git tag name (e.g., v1.2.3)

Options:
  --dry-run         Dry run mode (don't create actual release)
  --help, -h        Show this help message

Environment Variables:
  GEMINI_API_KEY    Required for AI changelog generation
  GH_TOKEN          Required for GitHub release creation

Examples:
  node scripts/create-release.js v1.2.3
  node scripts/create-release.js v1.2.3 --dry-run
`);
    process.exit(0);
  }

  const tagName = args[0];
  const isDryRun = args.includes('--dry-run');

  if (!tagName.match(/^v\d+\.\d+\.\d+/)) {
    console.error('❌ Invalid tag name. Expected format: v1.2.3');
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️ No GEMINI_API_KEY provided, will use raw Markdown fallback');
  }

  if (!isDryRun && !process.env.GH_TOKEN) {
    console.error('❌ GH_TOKEN environment variable is required for actual release creation');
    process.exit(1);
  }

  try {
    console.log(`🚀 Starting release creation for ${tagName}`);
    if (isDryRun) {
      console.log('🧪 DRY RUN MODE - No actual release will be created');
    }

    const generator = new ChangelogGenerator(apiKey);

    const options = {
      isDryRun,
      actionUrl: '', // No action URL for manual runs
      owner: 'OneKeyHQ',
      repo: 'hardware-js-sdk',
    };

    const result = await generator.createCompleteRelease(tagName, options);

    if (result.success) {
      console.log('✅ Release creation completed successfully');
      if (result.releaseResult && result.releaseResult.releaseUrl) {
        console.log(`🔗 Release URL: ${result.releaseResult.releaseUrl}`);
      }
    } else {
      console.log(`⏭️ Skipped: ${result.reason}`);
    }
  } catch (error) {
    console.error('❌ Release creation failed:', error.message);
    process.exit(1);
  }
}

main();
