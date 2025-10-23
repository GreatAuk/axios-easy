import { x } from 'tinyexec'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PACKAGE_JSON_PATH = join(process.cwd(), 'package.json')
const PRIVATE_NPM_REGISTRY = 'http://spnpm.sdptest.shengpay.com/'
const PUBLIC_NPM_REGISTRY = 'https://registry.npmjs.org/'
const PRIVATE_PACKAGE_NAME = '@sp/axios-easy'

/**
 * 读取 package.json 文件
 */
async function readPackageJson() {
  const content = await readFile(PACKAGE_JSON_PATH, 'utf-8')
  return JSON.parse(content)
}

/**
 * 写入 package.json 文件
 */
async function writePackageJson(packageData) {
  await writeFile(PACKAGE_JSON_PATH, JSON.stringify(packageData, null, 2) + '\n', 'utf-8')
}

/**
 * 执行命令并输出日志
 */
async function execCommand(command, args = [], options = {}) {
  console.log(`\n🚀 执行命令: ${command} ${args.join(' ')}`)
  try {
    const result = await x(command, args, options)
    if (result.stdout) {
      console.log(result.stdout)
    }
    if (result.stderr) {
      console.error(result.stderr)
    }
    return result
  } catch (error) {
    console.error(`❌ 命令执行失败: ${error.message}`)
    throw error
  }
}

/**
 * 发布到 npm 公共仓库
 */
async function publishToNpm() {
  console.log('\n📦 开始发布到 npm 公共仓库...')

  // 1. 构建项目
  await execCommand('pnpm', ['build'])

  // 2. 发布到 npm
  await execCommand('npm', ['publish', '--registry', PUBLIC_NPM_REGISTRY])

  console.log('✅ 成功发布到 npm 公共仓库')
}

/**
 * 发布到私有 npm 仓库
 */
async function publishToPrivateNpm() {
  console.log('\n📦 开始发布到公司私有 npm 仓库...')

  let originalPackageJson = null

  try {
    // 1. 读取并备份 package.json
    console.log('📝 备份 package.json...')
    originalPackageJson = await readPackageJson()

    // 2. 修改 package name
    console.log(`📝 修改 package name 为 ${PRIVATE_PACKAGE_NAME}...`)
    const modifiedPackageJson = { ...originalPackageJson, name: PRIVATE_PACKAGE_NAME }
    await writePackageJson(modifiedPackageJson)

    // 3. 发布到私有仓库
    await execCommand('npm', ['publish', '--registry', PRIVATE_NPM_REGISTRY])

    console.log('✅ 成功发布到私有 npm 仓库')
  } catch (error) {
    console.error('❌ 发布到私有仓库失败:', error.message)
    throw error
  } finally {
    // 4. 还原 package.json
    if (originalPackageJson) {
      console.log('📝 还原 package.json...')
      await writePackageJson(originalPackageJson)
      console.log('✅ package.json 已还原')
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🎯 开始自动发布流程...\n')

    // 1. 发布到 npm 公共仓库
    await publishToNpm()

    // 2. 发布到私有 npm 仓库
    await publishToPrivateNpm()

    console.log('\n🎉 所有发布任务完成！')
  } catch (error) {
    console.error('\n❌ 发布流程失败:', error.message)
    process.exit(1)
  }
}

// 执行主函数
main()
