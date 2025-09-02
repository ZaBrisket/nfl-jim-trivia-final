
export function levenshtein(a:string, b:string): number {
  a=a.toLowerCase(); b=b.toLowerCase()
  const m=a.length, n=b.length
  const dp = new Array(n+1); for(let j=0;j<=n;j++) dp[j]=j
  for(let i=1;i<=m;i++){
    let prev=dp[0]; dp[0]=i
    for(let j=1;j<=n;j++){
      const tmp=dp[j]
      const cost = a[i-1]===b[j-1] ? 0 : 1
      dp[j]=Math.min(dp[j]+1, dp[j-1]+1, prev+cost)
      prev=tmp
    }
  }
  return dp[n]
}
