export function selectReviewers({
  author,
  participants = [],
  completedLogins = [],
  owner = "akiroussama",
  random = Math.random,
} = {}) {
  const authorLower = typeof author === "string" ? author.toLowerCase() : null;
  const ownerLower = typeof owner === "string" ? owner.toLowerCase() : null;
  const isValidLogin = (login) => {
    if (typeof login !== "string") return false;
    if (login.length === 0 || login.length > 39) return false;
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(login)) return false;
    if (login.includes("--")) return false;
    const low = login.toLowerCase();
    if (low === "ghost") return false;
    if (low.includes("[bot]")) return false;
    return true;
  };
  const list = Array.isArray(participants) ? participants : [];
  const doneList = Array.isArray(completedLogins) ? completedLogins : [];
  const doneSet = new Set();
  for (const c of doneList) {
    if (typeof c === "string" && c.length > 0) doneSet.add(c.toLowerCase());
  }
  let authorTeam = null;
  if (authorLower !== null) {
    for (const p of list) {
      if (!p || typeof p.login !== "string") continue;
      if (p.login.toLowerCase() !== authorLower) continue;
      if (typeof p.team === "string" && p.team.trim() !== "") {
        authorTeam = p.team.trim();
        break;
      }
    }
  }
  const seen = new Set();
  const eligible = [];
  for (const p of list) {
    if (!p || typeof p.login !== "string") continue;
    const login = p.login;
    const low = login.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    if (authorLower !== null && low === authorLower) continue;
    if (ownerLower !== null && low === ownerLower) continue;
    if (!isValidLogin(login)) continue;
    let team = null;
    if (typeof p.team === "string" && p.team.trim() !== "")
      team = p.team.trim();
    eligible.push({ login, lower: low, team, completed: doneSet.has(low) });
  }
  const teamRank = (team) => {
    if (authorTeam === null) return 1;
    if (team === null) return 1;
    return team.toLowerCase() === authorTeam.toLowerCase() ? 2 : 0;
  };
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  shuffled.sort((a, b) => {
    const ac = a.completed ? 0 : 1;
    const bc = b.completed ? 0 : 1;
    if (ac !== bc) return ac - bc;
    return teamRank(a.team) - teamRank(b.team);
  });
  const reviewers = shuffled.slice(0, 2).map((e) => e.login);
  if (
    reviewers.length < 2 &&
    typeof owner === "string" &&
    isValidLogin(owner)
  ) {
    if (
      ownerLower !== authorLower &&
      !reviewers.some((l) => l.toLowerCase() === ownerLower)
    ) {
      reviewers.push(owner);
    }
  }
  return { reviewers, missing: 2 - reviewers.length };
}
