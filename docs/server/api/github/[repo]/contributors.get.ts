import { initOctokitRequestHandler } from '~~/server/utils/github'

export default defineCachedEventHandler(async (e) => {
  const { octokit, repo, owner } = initOctokitRequestHandler(e)
  const { data: contributors } = await octokit.request('GET /repos/{owner}/{repo}/contributors', {
    repo,
    owner,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  return contributors.map(contributor => ({
    login: contributor.login,
    avatar_url: contributor.avatar_url,
    contributions: contributor.contributions,
  })).filter((contributor) => {
    // filter bots
    return !contributor.login.includes('[bot]')
  })
}, {
  swr: true,
  maxAge: 60 * 60,
})
