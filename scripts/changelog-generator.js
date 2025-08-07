/**
 * OneKey Hardware JS SDK Changelog Generator
 * 专为 auto-release.yml workflow 设计
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { GoogleGenAI } = require('@google/genai');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 完整的 Changelog 生成器 - 包含所有功能
 */
class ChangelogGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;

    // Git 类型映射
    this.typeMapping = {
      feat: { section: '✨ New Features', emoji: '✨' },
      fix: { section: '🐞 Bug Fixes', emoji: '🐞' },
      chore: { section: '💎 Improvements', emoji: '💎' },
      refactor: { section: '💎 Improvements', emoji: '💎' },
      perf: { section: '💎 Improvements', emoji: '💎' },
      docs: { section: '📚 Documentation', emoji: '📚' },
      style: { section: '💎 Improvements', emoji: '💎' },
      test: { section: '🧪 Testing', emoji: '🧪' },
    };

    // 初始化 AI 模型
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * 执行 Git 命令并返回结果
   */
  execGit(command) {
    try {
      return execSync(command, { encoding: 'utf8' }).trim();
    } catch (error) {
      console.error(`Git command failed: ${command}`);
      console.error(error.message);
      return '';
    }
  }

  /**
   * 查找上一个正式版本标签
   */
  findPreviousStableTag(currentTag) {
    console.log(`🔍 Finding previous stable tag before ${currentTag}`);

    // 获取所有正式版本标签（不含预发布）
    const allTags = this.execGit('git tag --sort=-version:refname');
    const stableTags = allTags
      .split('\n')
      .filter(tag => tag.match(/^v\d+\.\d+\.\d+$/))
      .filter(tag => tag !== currentTag);

    const prevTag = stableTags[0] || '';
    console.log(`📍 Previous stable tag: ${prevTag || 'None found'}`);

    return prevTag;
  }

  /**
   * 获取 PR 详细信息
   */
  getPRDetails(prNumbers) {
    const prDetails = [];

    for (const prNum of prNumbers) {
      const prNumber = prNum.replace('#', '');

      try {
        // 使用 GitHub CLI 获取 PR 信息
        const prInfo = this.execGit(`gh pr view ${prNumber} --json title,body,url 2>/dev/null`);

        if (prInfo) {
          const prData = JSON.parse(prInfo);
          prDetails.push({
            number: prNumber,
            title: prData.title || 'No title',
            body: prData.body || 'No description',
            url: prData.url || '',
          });
        } else {
          // 如果 GitHub CLI 不可用，使用基础信息
          prDetails.push({
            number: prNumber,
            title: `PR #${prNumber}`,
            body: 'Description not available (GitHub CLI not configured)',
            url: '',
          });
        }
      } catch (error) {
        console.warn(`⚠️  Could not fetch details for PR #${prNumber}: ${error.message}`);
        prDetails.push({
          number: prNumber,
          title: `PR #${prNumber}`,
          body: 'Description not available',
          url: '',
        });
      }
    }

    return prDetails;
  }

  /**
   * 收集变更信息
   */
  /**
   * Stage 1: Generate Raw Markdown Changelog
   * Creates a publication-ready Markdown changelog from git data
   */
  generateRawMarkdownChangelog(currentTag, prevTag) {
    console.log(`📊 Stage 1: Generating raw Markdown changelog for ${currentTag}`);

    let commitRange;
    if (!prevTag) {
      commitRange = 'HEAD~30..HEAD';
      console.log(`⚠️ No previous tag found, using recent commits: ${commitRange}`);
    } else {
      commitRange = `${prevTag}..${currentTag}`;
      console.log(`📈 Using commit range: ${commitRange}`);
    }

    try {
      // Get commit information with structured format
      const commits = this.execGit(
        `git log ${commitRange} --pretty=format:"%h|%s|%an|%ad" --date=short`
      );

      if (!commits.trim()) {
        console.log('📋 No commits found in range, generating minimal changelog');
        return this.generateMinimalChangelog();
      }

      // Parse and categorize commits
      const categorizedCommits = this.categorizeCommits(commits);

      // Extract PR information
      const commitMessages = this.execGit(`git log ${commitRange} --pretty=format:"%s"`);
      const prNumbers = commitMessages.match(/#\d+/g) || [];
      const uniquePRs = [...new Set(prNumbers)].slice(0, 20);

      console.log(`🔍 Fetching details for ${uniquePRs.length} PRs...`);
      const prDetails = this.getPRDetails(uniquePRs);

      // Generate structured Markdown changelog
      const rawChangelog = this.buildMarkdownChangelog(categorizedCommits, prDetails);

      console.log('✅ Stage 1: Raw Markdown changelog generated successfully');
      return rawChangelog;
    } catch (error) {
      console.warn(`⚠️ Stage 1 failed: ${error.message}`);
      return this.generateErrorFallbackChangelog(currentTag, error.message);
    }
  }

  /**
   * Categorize commits by type for structured changelog
   */
  categorizeCommits(commits) {
    const categories = {
      feat: [],
      fix: [],
      chore: [],
      refactor: [],
      perf: [],
      docs: [],
      style: [],
      test: [],
      other: [],
    };

    commits.split('\n').forEach(line => {
      if (!line.trim()) return;

      const [hash, message, author, date] = line.split('|');
      if (!hash || !message) return;

      const commit = {
        hash: hash.trim(),
        message: message.trim(),
        author: author?.trim() || 'Unknown',
        date: date?.trim() || 'Unknown',
      };

      // Determine commit type
      const type = this.getCommitType(commit.message);
      if (categories[type]) {
        categories[type].push(commit);
      } else {
        categories.other.push(commit);
      }
    });

    return categories;
  }

  /**
   * Get commit type from message
   */
  getCommitType(message) {
    if (!message) return 'other';

    const typeMatch = message.match(/^(\w+):/);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase();
      // Map known types
      const knownTypes = ['feat', 'fix', 'chore', 'refactor', 'perf', 'docs', 'style', 'test'];
      return knownTypes.includes(type) ? type : 'other';
    }

    return 'other';
  }

  /**
   * Build structured Markdown changelog from categorized commits with enhanced PR integration
   */
  buildMarkdownChangelog(categorizedCommits, prDetails) {
    let changelog = '';

    // Create enhanced PR lookup map with detailed analysis
    const prMap = new Map();
    const processedPRs = new Set();

    prDetails.forEach(pr => {
      prMap.set(`#${pr.number}`, this.enhancePRData(pr));
    });

    // Build sections in order of importance
    const sections = [
      { key: 'feat', title: '✨ New Features', emoji: '✨' },
      { key: 'fix', title: '🐞 Bug Fixes', emoji: '🐞' },
      { key: 'perf', title: '⚡ Performance Improvements', emoji: '⚡' },
      { key: 'refactor', title: '♻️ Code Refactoring', emoji: '♻️' },
      { key: 'chore', title: '💎 Improvements', emoji: '💎' },
      { key: 'docs', title: '📚 Documentation', emoji: '📚' },
      { key: 'style', title: '💄 Style Changes', emoji: '💄' },
      { key: 'test', title: '🧪 Testing', emoji: '🧪' },
      { key: 'other', title: '📦 Other Changes', emoji: '📦' },
    ];

    sections.forEach(section => {
      const commits = categorizedCommits[section.key];
      if (commits && commits.length > 0) {
        changelog += `### ${section.title}\n\n`;

        // Group commits by PR to avoid duplication
        const prGroups = this.groupCommitsByPR(commits, prMap);

        prGroups.forEach(group => {
          if (group.pr) {
            // Enhanced PR-based entry
            const prEntry = this.buildEnhancedPREntry(group.pr, group.commits);
            changelog += prEntry;
            processedPRs.add(group.pr.number);
          } else {
            // Individual commit entries
            group.commits.forEach(commit => {
              const description = this.cleanCommitMessage(commit.message);
              changelog += `* ${description} (\`${commit.hash}\`)\n`;
            });
          }
        });

        changelog += '\n';
      }
    });

    return changelog.trim() || this.generateMinimalChangelog();
  }

  /**
   * Enhance PR data with detailed analysis and commit extraction
   */
  enhancePRData(pr) {
    const enhanced = { ...pr };

    // Extract commits from PR description
    enhanced.extractedCommits = this.extractCommitsFromPRDescription(pr.body || '');

    // Extract CodeRabbit summary if available
    enhanced.aiSummary = this.extractCodeRabbitSummary(pr.body || '');

    // Analyze PR impact
    enhanced.impact = this.analyzePRImpact(pr);

    // Filter user-facing changes
    enhanced.userFacingChanges = this.filterUserFacingChanges(enhanced.extractedCommits);

    return enhanced;
  }

  /**
   * Extract commits from PR description
   */
  extractCommitsFromPRDescription(prBody) {
    const commits = [];

    // Look for commit lists in various formats
    const patterns = [
      // Standard commit format: * feat: description
      /^\s*[*-]\s*(feat|fix|chore|refactor|perf|docs|style|test|build|ci):\s*(.+)$/gim,
      // GitHub commit format: - commit_hash description
      /^\s*[*-]\s*([a-f0-9]{7,40})\s+(.+)$/gim,
      // Simple bullet points that look like commits
      /^\s*[*-]\s*([^:]+:\s*.+)$/gim,
    ];

    patterns.forEach(pattern => {
      let match;
      // eslint-disable-next-line no-cond-assign
      while ((match = pattern.exec(prBody)) !== null) {
        const type = match[1] || 'other';
        const message = match[2] || match[1];

        if (message && message.length > 5) {
          commits.push({
            type: type.toLowerCase(),
            message: message.trim(),
            raw: match[0].trim(),
          });
        }
      }
    });

    return commits;
  }

  /**
   * Extract CodeRabbit AI summary information
   */
  extractCodeRabbitSummary(prBody) {
    const summaryPatterns = [
      // CodeRabbit summary section
      /## Summary[\s\S]*?(?=##|$)/i,
      // AI-generated summary
      /## AI Summary[\s\S]*?(?=##|$)/i,
      // Overview section
      /## Overview[\s\S]*?(?=##|$)/i,
    ];

    for (const pattern of summaryPatterns) {
      const match = prBody.match(pattern);
      if (match) {
        return this.cleanSummaryText(match[0]);
      }
    }

    // Look for summary-like content in the first paragraph
    const firstParagraph = prBody.split('\n\n')[0];
    if (firstParagraph && firstParagraph.length > 50 && firstParagraph.length < 500) {
      return this.cleanSummaryText(firstParagraph);
    }

    return null;
  }

  /**
   * Clean and format summary text
   */
  cleanSummaryText(text) {
    return text
      .replace(/^##\s*[^#\n]*\n?/i, '') // Remove header
      .replace(/^\s*[*-]\s*/gm, '') // Remove bullet points
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Analyze PR impact and categorize changes
   */
  analyzePRImpact(pr) {
    const impact = {
      breaking: false,
      userFacing: true,
      scope: 'minor',
      categories: [],
    };

    const title = (pr.title || '').toLowerCase();
    const body = (pr.body || '').toLowerCase();
    const combined = `${title} ${body}`;

    // Check for breaking changes
    if (
      combined.includes('breaking') ||
      combined.includes('major') ||
      combined.includes('breaking change') ||
      combined.includes('!:')
    ) {
      impact.breaking = true;
      impact.scope = 'major';
    }

    // Determine if user-facing
    const internalKeywords = ['chore:', 'ci:', 'build:', 'test:', 'internal', 'refactor:'];
    impact.userFacing = !internalKeywords.some(keyword => combined.includes(keyword));

    // Categorize by type
    if (combined.includes('feat:') || combined.includes('feature'))
      impact.categories.push('feature');
    if (combined.includes('fix:') || combined.includes('bug')) impact.categories.push('bugfix');
    if (combined.includes('perf:') || combined.includes('performance'))
      impact.categories.push('performance');
    if (combined.includes('security')) impact.categories.push('security');

    return impact;
  }

  /**
   * Filter user-facing changes from extracted commits
   */
  filterUserFacingChanges(commits) {
    const nonUserFacingTypes = ['chore', 'ci', 'build', 'test'];
    const nonUserFacingKeywords = ['update version', 'bump version', 'log', 'debug', 'lint'];

    return commits.filter(commit => {
      // Filter by type
      if (nonUserFacingTypes.includes(commit.type)) {
        return false;
      }

      // Filter by message content
      const message = commit.message.toLowerCase();
      if (nonUserFacingKeywords.some(keyword => message.includes(keyword))) {
        return false;
      }

      // Keep substantial changes
      return commit.message.length > 10;
    });
  }

  /**
   * Group commits by PR to avoid duplication
   */
  groupCommitsByPR(commits, prMap) {
    const groups = [];
    const processedCommits = new Set();

    commits.forEach(commit => {
      if (!commit || !commit.hash || processedCommits.has(commit.hash)) return;

      const message = commit.message || '';
      const prMatch = message.match(/#(\d+)/);

      if (prMatch && prMap.has(`#${prMatch[1]}`)) {
        const pr = prMap.get(`#${prMatch[1]}`);

        // Find all commits for this PR
        const prCommits = commits.filter(
          c =>
            c && c.message && c.message.includes(`#${prMatch[1]}`) && !processedCommits.has(c.hash)
        );

        prCommits.forEach(c => processedCommits.add(c.hash));

        groups.push({
          pr,
          commits: prCommits,
        });
      } else {
        // Individual commit without PR
        processedCommits.add(commit.hash);
        groups.push({
          pr: null,
          commits: [commit],
        });
      }
    });

    return groups;
  }

  /**
   * Build enhanced PR entry with detailed information
   */
  buildEnhancedPREntry(pr, commits) {
    let entry = '';

    // Use PR title as main description
    const mainDescription = pr.title || commits[0]?.message || 'Unknown change';

    // Add main entry
    entry += `* ${this.cleanCommitMessage(mainDescription)}`;

    // Add PR number reference
    entry += ` (#${pr.number})`;

    // Add commit hash if available
    if (commits.length === 1) {
      entry += ` (\`${commits[0].hash}\`)`;
    }

    entry += '\n';

    // Add detailed changes if available from PR description
    if (pr.userFacingChanges && pr.userFacingChanges.length > 0) {
      pr.userFacingChanges.slice(0, 3).forEach(change => {
        // Limit to 3 sub-items
        entry += `  - ${this.cleanCommitMessage(change.message)}\n`;
      });
    }

    // Add AI summary if available and concise
    if (pr.aiSummary && pr.aiSummary.length > 20 && pr.aiSummary.length < 200) {
      entry += `  > ${pr.aiSummary}\n`;
    }

    return entry;
  }

  /**
   * Clean commit message for display
   */
  cleanCommitMessage(message) {
    if (!message || typeof message !== 'string') {
      return 'Unknown change';
    }

    return (
      message
        .replace(/^(feat|fix|chore|refactor|perf|docs|style|test|build|ci):\s*/i, '') // Remove type prefix
        .replace(/\s*\(#\d+\)$/, '') // Remove PR reference at end
        .replace(/^\s*[*-]\s*/, '') // Remove bullet points
        .trim() || 'Unknown change'
    );
  }

  /**
   * Generate minimal changelog when no commits found
   */
  generateMinimalChangelog() {
    return `### 💎 Improvements
* Updated dependencies and improved overall stability
* Minor bug fixes and performance enhancements`;
  }

  /**
   * Generate error fallback changelog
   */
  generateErrorFallbackChangelog(version, errorMessage) {
    return `### 📦 Release v${version}
* Release generated with limited information due to git access issues
* Please check the repository history for detailed changes

> Note: ${errorMessage}`;
  }

  /**
   * Stage 2: AI Enhancement Pipeline
   * Enhances raw Markdown changelog with AI-powered improvements
   */
  async enhanceChangelogWithAI(version, rawMarkdownChangelog) {
    console.log(`🤖 Stage 2: Attempting AI enhancement for v${version}`);

    if (!this.apiKey || !this.genAI) {
      console.log('🔄 No AI API key provided, skipping enhancement');
      return null;
    }

    try {
      const prompt = this.getAIEnhancementPrompt(version, rawMarkdownChangelog);
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: prompt,
      });

      const enhancedChangelog = result.text;

      if (enhancedChangelog && enhancedChangelog.length > 50) {
        console.log('✅ Stage 2: AI enhancement completed successfully');
        return enhancedChangelog;
      }

      throw new Error('AI response too short or empty');
    } catch (error) {
      console.warn(`⚠️ Stage 2 failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Stage 3: Intelligent Fallback Strategy
   * Selects the best available changelog version
   */
  selectBestChangelog(version, rawChangelog, enhancedChangelog) {
    console.log(`📋 Stage 3: Selecting best changelog for v${version}`);

    if (enhancedChangelog) {
      console.log('✅ Stage 3: Using AI-enhanced changelog');
      return {
        changelog: enhancedChangelog,
        source: 'ai-enhanced',
        fallbackUsed: false,
      };
    }
    console.log('🔄 Stage 3: Using raw Markdown changelog (fallback)');
    return {
      changelog: rawChangelog,
      source: 'raw-markdown',
      fallbackUsed: true,
    };
  }

  /**
   * Complete changelog generation pipeline (Stages 1-3)
   */
  async generateCompleteChangelog(version, currentTag, prevTag) {
    console.log(`🚀 Starting complete changelog pipeline for v${version}`);

    // Stage 1: Generate raw Markdown changelog
    const rawChangelog = this.generateRawMarkdownChangelog(currentTag, prevTag);

    // Display Stage 1 output
    console.log('📋 STAGE 1 - RAW MARKDOWN CHANGELOG:');
    console.log('=====================================');
    console.log(rawChangelog);
    console.log('=====================================\n');

    // Stage 2: Attempt AI enhancement
    const enhancedChangelog = await this.enhanceChangelogWithAI(version, rawChangelog);

    // Display Stage 2 output if available
    if (enhancedChangelog) {
      console.log('🤖 STAGE 2 - AI-ENHANCED CHANGELOG:');
      console.log('===================================');
      console.log(enhancedChangelog);
      console.log('===================================\n');
    }

    // Stage 3: Select best version
    const result = this.selectBestChangelog(version, rawChangelog, enhancedChangelog);

    // Display final selection
    console.log('📋 STAGE 3 - FINAL SELECTED CHANGELOG:');
    console.log('======================================');
    console.log(`Source: ${result.source.toUpperCase()}`);
    console.log(`Fallback Used: ${result.fallbackUsed ? 'YES' : 'NO'}`);
    console.log('--------------------------------------');
    console.log(result.changelog);
    console.log('======================================\n');

    console.log(`✅ Pipeline complete: Using ${result.source} changelog`);
    return {
      ...result,
      rawChangelog, // Always include raw version for dry-run files
    };
  }

  /**
   * Get AI enhancement prompt template
   */
  getAIEnhancementPrompt(version, rawMarkdownChangelog) {
    return `You are a professional technical writer creating release notes for a hardware wallet SDK. Transform the raw changelog below into a polished, professional format that matches the style of high-quality GitHub releases like Trezor Suite.

**Target Format Example:**
### 🚀 New features
* Feature description that clearly explains what was added and its benefit to users.
* Another feature with clear, concise description focusing on user value.

### 🎨 Improvements
* Improvement description that explains what was enhanced and why it matters.
* Performance enhancement with specific details about the improvement.

### 🔧 Bug fixes
* Bug fix description that clearly states what issue was resolved.

**Raw Changelog to Transform:**
${rawMarkdownChangelog}

**Strict Requirements:**
1. Use EXACTLY these section headers with proper Markdown formatting: "### 🚀 New features", "### 🎨 Improvements", "### 🔧 Bug fixes"
2. Write each bullet point as a single, clear sentence that explains WHAT was done and WHY it benefits users
3. Focus on user-facing value, not technical implementation details
4. Remove all commit hashes, PR numbers, and technical metadata
5. Remove any HTML comments, artifacts, or sub-bullets
6. Use professional, marketing-friendly language that explains benefits to end users
7. Combine related changes into single, comprehensive bullet points
8. Only include sections that have actual content - omit empty sections entirely
9. Start directly with section headers - no introduction or wrapper text
10. Return only clean Markdown - no code blocks, no additional commentary
11. Each bullet point must start with "* " (asterisk and space)

Transform now:`;
  }

  /**
   * Save raw Markdown changelog for dry-run mode (Stage 1 output only)
   */
  saveDryRunRawChangelog(version, releaseData, options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rawFilename = `release-raw-changelog-v${version}-${timestamp}.md`;
      const rawFilepath = path.join(process.cwd(), rawFilename);

      const rawContent = `# Stage 1 Raw Changelog - v${version}

**Generated at:** ${new Date().toISOString()}
**Pipeline Stage:** Stage 1 (Raw Data Collection & Markdown Generation)
**Source:** Git commits and PR data (no AI enhancement)
**Next Stage:** ${
        releaseData.fallbackUsed ? 'AI enhancement failed/skipped' : 'AI enhancement successful'
      }

## Metadata
- **Version:** v${version}
- **Previous Tag:** ${this.findPreviousStableTag(`v${version}`) || 'None'}
- **Current Branch:** ${this.getCurrentBranch()}
- **Commit:** ${this.getCurrentCommit()}

## Stage 1 Raw Markdown Output

${releaseData.rawChangelog || 'No raw changelog available'}

---

> **Stage 1 Output**: This is the raw, unprocessed changelog generated directly from git commits and PR data.
> This serves as the fallback version if AI enhancement fails and represents the baseline quality.
> Compare this with the final release file to see the AI enhancement improvements.
`;

      fs.writeFileSync(rawFilepath, rawContent);
      console.log(`📄 Stage 1 raw changelog saved to: ${rawFilename}`);

      return rawFilename;
    } catch (error) {
      console.warn(`⚠️ Failed to save raw changelog: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取当前分支
   */
  getCurrentBranch() {
    try {
      return this.execGit('git branch --show-current');
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 获取当前提交
   */
  getCurrentCommit() {
    try {
      return this.execGit('git rev-parse HEAD');
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 获取所有标签
   */
  getAllTags() {
    try {
      const tags = this.execGit('git tag --sort=-version:refname');
      return tags.split('\n').filter(tag => tag.trim());
    } catch (error) {
      return [];
    }
  }

  /**
   * 创建 GitHub Release
   */
  createGitHubRelease(version, changelog, options = {}) {
    try {
      console.log(`🚀 Creating GitHub Release for v${version}`);

      const { isDryRun = false, actionUrl = '', owner = '', repo = '' } = options;

      if (isDryRun) {
        console.log('🧪 DRY RUN MODE - No actual release created');
        console.log(`📦 Version: v${version}`);
        console.log('📋 Changelog generated and logged above');

        // 保存 dry-run 结果到本地文件
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `release-dry-run-v${version}-${timestamp}.md`;
        const filepath = path.join(process.cwd(), filename);

        // Check for corresponding raw changelog file
        const rawChangelogFile = options.rawChangelogFilename || null;
        const hasRawChangelog = !!rawChangelogFile;

        const dryRunContent = `# Release v${version}

**Generated at:** ${new Date().toISOString()}
**Mode:** Dry Run (No actual release created)

${changelog}

---

✅ All checks passed - ready for actual release
`;

        try {
          fs.writeFileSync(filepath, dryRunContent);
          console.log(`📄 Dry-run results saved to: ${filename}`);
          if (hasRawChangelog) {
            console.log(`📊 Raw changelog available in: ${rawChangelogFile}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to save dry-run results: ${error.message}`);
        }

        console.log('✅ All checks passed - ready for actual release');
        return { success: true, dryRun: true, outputFile: filename };
      }

      // Add footer with action link if provided
      const fullChangelog = actionUrl
        ? `${changelog}\n\n---\n\n* github action: <${actionUrl}>`
        : changelog;

      // Use GitHub CLI to create release
      const releaseData = {
        tag_name: `v${version}`,
        name: `v${version}`,
        body: fullChangelog,
        draft: false,
        prerelease: false,
      };

      // Create release using GitHub CLI
      const releaseJson = JSON.stringify(releaseData).replace(/"/g, '\\"');
      const createCommand = `gh release create "v${version}" --title "v${version}" --notes "${fullChangelog.replace(
        /"/g,
        '\\"'
      )}"`;

      try {
        const result = this.execGit(createCommand);
        console.log(
          `✅ Created release: https://github.com/${owner}/${repo}/releases/tag/v${version}`
        );
        return {
          success: true,
          dryRun: false,
          releaseUrl: `https://github.com/${owner}/${repo}/releases/tag/v${version}`,
        };
      } catch (error) {
        console.error('❌ Failed to create release with GitHub CLI:', error.message);
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to create GitHub Release:', error.message);
      throw error;
    }
  }

  /**
   * 更新 CHANGELOG.md 文件
   */
  updateChangelogFile(version) {
    try {
      console.log(`📝 Updating CHANGELOG.md for version ${version}`);

      const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

      if (!fs.existsSync(changelogPath)) {
        console.log('📋 No local CHANGELOG.md file (using GitHub releases for changelog)');
        return false;
      }

      const content = fs.readFileSync(changelogPath, 'utf8');

      // Check if version already exists
      if (content.includes(`| ${version} |`)) {
        console.log(`📋 Version ${version} already exists in CHANGELOG.md`);
        return false;
      }

      // Add new version to table
      const date = new Date().toISOString().split('T')[0];
      const newRow = `| ${version} | ${date} | Latest release |`;

      // Insert after table header
      const updatedContent = content.replace(
        /(\|---------|--------------|-------------|)/,
        `$1\n${newRow}`
      );

      fs.writeFileSync(changelogPath, updatedContent);
      console.log('✅ Updated CHANGELOG.md');
      return true;
    } catch (error) {
      console.error('❌ Failed to update CHANGELOG.md:', error.message);
      return false;
    }
  }

  /**
   * Complete workflow - from tag to changelog using new 3-stage pipeline
   */
  async generateReleaseChangelog(tagName) {
    try {
      console.log(`🚀 Starting changelog generation for ${tagName}`);

      // 1. Check version type
      const version = tagName.replace(/^v/, '');
      const isPrerelease = version.includes('-');

      if (isPrerelease) {
        console.log(`⏭️ Skipping changelog generation for prerelease version: ${version}`);
        return null;
      }

      // 2. Find previous stable version
      const prevTag = this.findPreviousStableTag(tagName);

      // 3. Run complete changelog pipeline (Stages 1-3)
      const pipelineResult = await this.generateCompleteChangelog(version, tagName, prevTag);

      return {
        version,
        changelog: pipelineResult.changelog,
        rawChangelog: pipelineResult.rawChangelog,
        source: pipelineResult.source,
        fallbackUsed: pipelineResult.fallbackUsed,
        isPrerelease,
      };
    } catch (error) {
      console.error('❌ Failed to generate changelog:', error.message);
      throw error;
    }
  }

  /**
   * 完整的 Release 工作流程 - 生成 changelog 并创建 release
   */
  async createCompleteRelease(tagName, options = {}) {
    try {
      console.log(`🚀 Starting complete release workflow for ${tagName}`);

      // 1. 生成 changelog
      const result = await this.generateReleaseChangelog(tagName);

      if (!result) {
        console.log('⏭️ Skipped for prerelease version');
        return { success: false, reason: 'prerelease' };
      }

      const { version, changelog } = result;

      // Dry-run mode: Save raw Markdown changelog
      let rawChangelogFilename = null;
      if (options.isDryRun) {
        rawChangelogFilename = this.saveDryRunRawChangelog(version, result, options);
      }

      // 2. Create GitHub Release
      const releaseResult = this.createGitHubRelease(version, changelog, {
        ...options,
        rawChangelogFilename, // Pass raw changelog filename
        changelogSource: result.source, // Pass changelog source info
        fallbackUsed: result.fallbackUsed, // Pass fallback status
      });

      // 3. 更新 CHANGELOG.md
      if (!options.isDryRun) {
        this.updateChangelogFile(version);
      } else {
        // Dry-run 模式：预览 CHANGELOG.md 更新
        console.log('📋 CHANGELOG.md update preview (dry-run mode)');
        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

        if (fs.existsSync(changelogPath)) {
          const content = fs.readFileSync(changelogPath, 'utf8');
          const date = new Date().toISOString().split('T')[0];
          const newRow = `| ${version} | ${date} | Latest release |`;

          if (!content.includes(`| ${version} |`)) {
            console.log(`📝 Would add to CHANGELOG.md: ${newRow}`);
          } else {
            console.log(`📋 Version ${version} already exists in CHANGELOG.md`);
          }
        } else {
          console.log('📋 No local CHANGELOG.md file (using GitHub releases)');
        }
      }

      return {
        success: true,
        version,
        changelog,
        releaseResult,
      };
    } catch (error) {
      console.error('❌ Failed to create complete release:', error.message);
      throw error;
    }
  }
}

module.exports = {
  ChangelogGenerator,
};
