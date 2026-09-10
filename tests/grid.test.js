import { test } from "node:test";
import assert from "node:assert/strict";
import { renderGrid } from "../scripts/lib/grid.js";

const alice = {
  login: "alice",
  persona: {
    name: "Alice",
    avatar: "alice.png",
    welcomeMessage: "Bienvenue Alice !",
  },
};
const bob = {
  login: "bob",
  persona: {
    name: "Bob",
    avatar: "bob.png",
    welcomeMessage: "Bienvenue Bob !",
  },
};
const countArticles = (h) => (h.match(/<article[\s>]/g) || []).length;

test("normal two entries show page contract", () => {
  const html = renderGrid([alice, bob]);
  assert.match(html, /<html[^>]*lang="fr"/i);
  assert.match(html, /Mise en piste/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /styles\.css/);
  assert.equal(countArticles(html), 2);
  for (const e of [alice, bob]) {
    assert.ok(html.includes(e.persona.name));
    assert.ok(html.includes(e.persona.avatar));
    assert.ok(html.includes(e.persona.welcomeMessage));
  }
  assert.ok((html.match(/CP0 validé/g) || []).length >= 2);
  const m = html.match(/href="([^"]*cp1\.html)"/);
  assert.ok(m && !m[1].startsWith("http"));
  assert.ok((html.match(/cp1\.html/g) || []).length >= 2);
});

test("empty grid keeps structure with empty state", () => {
  const html = renderGrid([]);
  assert.match(html, /<html[^>]*lang="fr"/i);
  assert.match(html, /Mise en piste/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /styles\.css/);
  assert.equal(countArticles(html), 0);
  assert.match(html, /<main|<section|<p/i);
  assert.ok(html.replace(/<[^>]+>/g, " ").trim().length > 20);
});

test("sorted by login without mutating input", () => {
  const input = [bob, alice];
  const snapshot = JSON.stringify(input);
  const html = renderGrid(input);
  assert.ok(html.indexOf("alice") < html.indexOf("bob"));
  assert.equal(JSON.stringify(input), snapshot);
});

test("malicious-looking text is escaped, no raw injection", () => {
  const evil = {
    login: "eve<script>alert(1)</script>",
    persona: {
      name: "Eve<img src=x onerror=alert(1)>",
      avatar: 'evil.png"><img src=x>',
      welcomeMessage:
        String.fromCharCode(38, 60, 62, 34, 39) + " coucou <script>hi</script>",
    },
  };
  const html = renderGrid([evil]);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("&amp;"));
  assert.ok(html.includes("&lt;"));
  assert.ok(html.includes("&gt;"));
  assert.match(html, /&quot;|&#34;|&#x22;/);
  assert.match(html, /&#39;|&#x27;|&apos;/);
});

test("systemPrompt sentinel is never rendered", () => {
  const sentinel = "SENTINEL_CP0_NEVER_SHOW_98765";
  const html = renderGrid([
    {
      login: "carol",
      persona: {
        name: "Carol",
        avatar: "carol.png",
        welcomeMessage: "Salut !",
        systemPrompt: sentinel,
      },
    },
  ]);
  assert.ok(!html.includes(sentinel));
  assert.equal(countArticles(html), 1);
  assert.ok(html.includes("Carol"));
});
