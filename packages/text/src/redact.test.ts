import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { strings } from "../test/strings.ts";
import { random } from "@mark1russell7/rigor-generators";
import {
  CONTEXT_SHAPES,
  findSecretShapes,
  findSecretShapesInValue,
  isSecretName,
  redactSecrets,
  redactSecretShapes,
  SECRET_SHAPES,
  type SecretShape,
} from "./redact.ts";

const MARK = "[secret]";

describe("redactSecrets", () => {
  it("removes the raw form, the form of encodeURIComponent and the form of URLSearchParams", () => {
    const secret = "k3y/with space!(x)~";
    const query = new URLSearchParams({ key: secret }).toString();
    expect(query).toBe("key=k3y%2Fwith+space%21%28x%29%7E");
    const text = `raw ${secret}, path /v1/${encodeURIComponent(secret)}/x, query ?${query}&b=1`;
    expect(redactSecrets(text, [secret])).toBe(`raw ${MARK}, path /v1/${MARK}/x, query ?key=${MARK}&b=1`);
  });

  it("removes the password and the Basic form of a pair, and keeps the user", () => {
    const pair = { user: "client-id-0001", password: "client-secret-0001" };
    const basic = Buffer.from(`${pair.user}:${pair.password}`, "utf8").toString("base64");
    const text = `GET /token user=${pair.user} password=${pair.password} Authorization: Basic ${basic} form=${encodeURIComponent(basic)}`;
    expect(redactSecrets(text, [pair])).toBe(`GET /token user=${pair.user} password=${MARK} Authorization: Basic ${MARK} form=${MARK}`);
    expect(redactSecrets(text, [pair, pair.user])).not.toContain(pair.user);
  });

  it("gives the Basic form of each test string as Buffer does, with a lone surrogate as U+FFFD", () => {
    const texts = [...strings("text/secrets/basic", 1000), "a\ud800b", "\udc00", "😀\ud83d"];
    for (const password of texts.filter((text) => text !== "")) {
      const basic = Buffer.from(`user:${password}`, "utf8").toString("base64");
      expect(redactSecrets(basic, [{ user: "user", password }])).toBe(MARK);
    }
  });

  it("gives one mark for each test string that is all one secret", () => {
    for (const secret of strings("text/secrets/whole", 1000).filter((text) => text !== "")) {
      expect(redactSecrets(secret, [secret])).toBe(MARK);
    }
  });

  it("removes the longest secret at a position, so a secret in a secret gives one mark", () => {
    expect(redactSecrets("token=abcdefghijkl end=abcdefgh", ["abcdefgh", "abcdefghijkl"])).toBe(`token=${MARK} end=${MARK}`);
  });

  it("finds each secret as text, not as a pattern", () => {
    expect(redactSecrets("a.b*c(d) aXbbc(d)", ["a.b*c(d)"])).toBe(`${MARK} aXbbc(d)`);
    expect(redactSecrets("x$&y", ["$&"])).toBe(`x${MARK}y`);
  });

  it("puts the mark of the options as text", () => {
    expect(redactSecrets("key=abc12345", ["abc12345"], { mark: "$&$1***" })).toBe("key=$&$1***");
  });

  it("ignores an empty secret and an empty password, and keeps a text with no secrets", () => {
    expect(redactSecrets("a text", [])).toBe("a text");
    expect(redactSecrets("a text", ["", { user: "a", password: "" }])).toBe("a text");
  });

  it("removes a secret with a lone surrogate in its raw form", () => {
    expect(redactSecrets("x\ud800y", ["\ud800"])).toBe(`x${MARK}y`);
  });
});

/** 36 letters and digits: the body of a classic token. The tests build each token, so the source holds no token. */
const BODY = "A1b2C3d4E5f6".repeat(3);

/** One token of each shape, built from parts. */
const SAMPLES: Readonly<Record<string, string>> = {
  "github-fine-grained": `github_pat_${"11ABCDEFG0".repeat(3).slice(0, 22)}_${"aB3".repeat(20).slice(0, 59)}`,
  "github-classic": `ghp_${BODY}`,
  "github-oauth": `gho_${BODY}`,
  "github-app-user": `ghu_${BODY}`,
  "github-app-installation": `ghs_${BODY}`,
  "github-app-refresh": `ghr_${BODY}`,
  npm: `npm_${BODY}`,
  anthropic: `sk-ant-api03-${"xY9_-".repeat(10)}`,
  "aws-access-key": `AKIA${"Q7".repeat(8)}`,
  slack: `xoxb-${"1234567890"}-${"abcDEF1234"}`,
  bearer: `Bearer ${"eyJhbGciOi.J9-_~+/".repeat(2)}==`,
  "private-key": ["-----BEGIN OPENSSH PRIVATE KEY-----", "b3BlbnNzaC1rZXk", "-----END OPENSSH PRIVATE KEY-----"].join("\n"),
};

function sample(id: string): string {
  const token = SAMPLES[id];
  if (token === undefined) throw new Error(`no sample for ${id}`);
  return token;
}

describe("findSecretShapes", () => {
  it("has a sample for each shape, and the catalog and each shape are frozen", () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(SECRET_SHAPES.map((shape) => shape.id).sort());
    expect(Object.isFrozen(SECRET_SHAPES)).toBe(true);
    for (const shape of SECRET_SHAPES) expect(Object.isFrozen(shape)).toBe(true);
  });

  it("finds each shape, and gives its name and span, not the token", () => {
    for (const id of Object.keys(SAMPLES)) {
      const token = sample(id);
      const matches = findSecretShapes(`a: ${token} end`);
      expect(matches).toEqual([{ shape: id, start: 3, end: 3 + token.length }]);
      expect(JSON.stringify(matches)).not.toContain(token);
    }
  });

  it("passes the near misses: a prefix in a sentence, a short body, a public key", () => {
    const misses = [
      "the shapes of known tokens (github_pat_, ghp_, gho_, ghs_, ghu_, npm_, a Bearer value, a private key block)",
      `ghp_${BODY.slice(1)}`,
      `npm_${BODY.slice(1)}`,
      `github_pat_${"a".repeat(81)}`,
      `sk-ant-${"a".repeat(31)}`,
      `AKIA${"Q7".repeat(8)}X`,
      "xoxb-short",
      "Authorization: Bearer <token>",
      "Authorization: Bearer $GITHUB_TOKEN",
      "the bearer of the news",
      "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZI\n-----END PUBLIC KEY-----",
      "-----BEGIN CERTIFICATE-----",
      "a task-ant-colony-simulation-with-many-words-in-its-name",
      `x${sample("github-classic")}`,
    ];
    for (const text of misses) expect(findSecretShapes(text)).toEqual([]);
  });

  it("finds a token in a JSON string and in the user part of a URL", () => {
    const json = JSON.stringify({ answer: `$ sh probe.sh\nGITHUB_TOKEN=${sample("github-fine-grained")}\nexit 1` });
    expect(findSecretShapes(json).map((match) => match.shape)).toEqual(["github-fine-grained"]);
    const url = `https://x-access-token:${encodeURIComponent(sample("github-app-installation"))}@github.com/o/r.git`;
    expect(findSecretShapes(url).map((match) => match.shape)).toEqual(["github-app-installation"]);
  });

  it("takes a private key block with no end line to the end of the text", () => {
    const text = "key:\n-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA";
    expect(findSecretShapes(text)).toEqual([{ shape: "private-key", start: 5, end: text.length }]);
  });

  it("finds no shape in the seeded strings, and finds each token between two of them", () => {
    const texts = strings("text/secret-shapes/noise", 200);
    for (const text of texts) expect(findSecretShapes(text)).toEqual([]);
    for (const [index, before] of texts.entries()) {
      const after = texts[(index + 1) % texts.length] ?? "";
      for (const id of Object.keys(SAMPLES)) {
        const token = sample(id);
        const start = before.length + 1;
        expect(findSecretShapes(`${before} ${token} ${after}`)).toContainEqual({ shape: id, start, end: start + token.length });
      }
    }
  });

  it("puts the longer match first at one start, takes the shapes of the caller and skips an empty match", () => {
    const pattern = /abc/gy;
    const shapes: SecretShape[] = [
      { id: "short", label: "short", pattern },
      { id: "long", label: "long", pattern: /abcdef/ },
      { id: "empty", label: "empty", pattern: /x*/ },
    ];
    expect(findSecretShapes("abcdef abc", shapes)).toEqual([
      { shape: "long", start: 0, end: 6 },
      { shape: "short", start: 0, end: 3 },
      { shape: "short", start: 7, end: 10 },
    ]);
    expect(pattern.lastIndex).toBe(0);
  });
});

describe("redactSecretShapes", () => {
  it("puts one mark in place of matches that overlap", () => {
    expect(redactSecretShapes(`Authorization: Bearer ${sample("github-classic")}`)).toBe(`Authorization: ${MARK}`);
  });

  it("puts a mark in place of each token, and keeps the text between them", () => {
    const text = `a=${sample("npm")} b=${sample("github-app-installation")} c`;
    expect(redactSecretShapes(text)).toBe(`a=${MARK} b=${MARK} c`);
  });

  it("uses the mark and the shapes of the options", () => {
    const npm = SECRET_SHAPES.filter((shape) => shape.id === "npm");
    const text = `a=${sample("npm")} b=${sample("github-classic")}`;
    expect(redactSecretShapes(text, { mark: "***", shapes: npm })).toBe(`a=*** b=${sample("github-classic")}`);
  });

  it("keeps a text with no token", () => {
    for (const text of ["", "no token here", ...strings("text/secret-shapes/keep", 200)]) {
      expect(redactSecretShapes(text)).toBe(text);
    }
  });
});

describe("findSecretShapesInValue", () => {
  it("finds a token at the start of a line, which a scan of the JSON text misses", () => {
    const answer = { answer: `$ sh probe.sh\n${sample("github-fine-grained")}\nexit 1`, status: "answered" };
    expect(findSecretShapes(JSON.stringify(answer))).toEqual([]);
    expect(findSecretShapesInValue(answer)).toEqual([{ shape: "github-fine-grained", start: 14, end: 14 + sample("github-fine-grained").length, path: ["answer"], inKey: false }]);
  });

  it("gives the path of each match in arrays and objects, in the order of the document, and finds a key", () => {
    const value = { a: [1, null, { note: sample("npm") }], [sample("github-classic")]: true, b: `x ${sample("slack")}` };
    const matches = findSecretShapesInValue(value);
    expect(matches.map((match) => [match.shape, match.path, match.inKey])).toEqual([
      ["npm", ["a", 2, "note"], false],
      ["github-classic", [sample("github-classic")], true],
      ["slack", ["b"], false],
    ]);
  });

  it("takes a string as the value, and examines an object that comes two times only one time", () => {
    expect(findSecretShapesInValue(sample("npm")).map((match) => match.path)).toEqual([[]]);
    const shared = { token: sample("npm") };
    const loop: Record<string, unknown> = { one: shared, two: shared };
    loop["self"] = loop;
    expect(findSecretShapesInValue(loop).map((match) => match.path)).toEqual([["one", "token"]]);
  });

  it("walks a deep value with no overflow of the stack, and gives nothing for a value with no strings", () => {
    let deep: unknown = sample("aws-access-key");
    for (let depth = 0; depth < 100_000; depth += 1) deep = [deep];
    const matches = findSecretShapesInValue(deep);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.path).toHaveLength(100_000);
    for (const value of [null, undefined, 3, true, [], {}, [1, [2, { a: 3 }]]]) expect(findSecretShapesInValue(value)).toEqual([]);
  });
});

describe("CONTEXT_SHAPES", () => {
  const all = [...SECRET_SHAPES, ...CONTEXT_SHAPES];
  const redact = (text: string): string => redactSecretShapes(text, { shapes: CONTEXT_SHAPES });

  it("is frozen, and each id is new", () => {
    expect(Object.isFrozen(CONTEXT_SHAPES)).toBe(true);
    for (const shape of CONTEXT_SHAPES) expect(Object.isFrozen(shape)).toBe(true);
    const ids = all.map((shape) => shape.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("puts a mark in place of the value and keeps the name, in real command lines", () => {
    const cases: readonly [string, string][] = [
      ['curl "https://api.example.com/v1?access_token=abc123&page=2"', 'curl "https://api.example.com/v1?access_token=[secret]&page=2"'],
      ["GITHUB_TOKEN=abc123 gh pr list", "GITHUB_TOKEN=[secret] gh pr list"],
      ["PGPASSWORD=hunter2 psql -h db", "PGPASSWORD=[secret] psql -h db"],
      ["MYSQL_PWD=hunter2 mysql", "MYSQL_PWD=[secret] mysql"],
      ["mysql --password=hunter2 -u root", "mysql --password=[secret] -u root"],
      ["node cli.js --token abc123 --verbose", "node cli.js --token [secret] --verbose"],
      ['tool --api-key "two words" --x', 'tool --api-key "[secret]" --x'],
      ["tool --client-secret 'a&b#c' next", "tool --client-secret '[secret]' next"],
      ['{"apiKey": "abc", "name": "x"}', '{"apiKey": "[secret]", "name": "x"}'],
      ["X-Api-Key: abc123", "X-Api-Key: [secret]"],
      ["Private-Token: abc123", "Private-Token: [secret]"],
      ["git clone https://user:p%40ss@github.com/o/r.git", "git clone https://user:[secret]@github.com/o/r.git"],
      ["https://x-access-token:abc@github.com/o/r", "https://x-access-token:[secret]@github.com/o/r"],
      ['curl -H "Authorization: Basic dXNlcjpwYXNz" x', 'curl -H "Authorization: Basic [secret]" x'],
      ["gh api -H 'authorization: token abc123' /user", "gh api -H 'authorization: token [secret]' /user"],
      ["Proxy-Authorization: Negotiate abc123", "Proxy-Authorization: Negotiate [secret]"],
      ["Authorization: abc123", "Authorization: [secret]"],
      ["curl -u admin:hunter2 https://x", "curl -u admin:[secret] https://x"],
      ["curl --user=admin:hunter2 https://x", "curl --user=admin:[secret] https://x"],
      ["https://acct.blob.core.windows.net/c?sv=2024&sig=abc%3D&se=2026", "https://acct.blob.core.windows.net/c?sv=2024&sig=[secret]&se=2026"],
      ["https://s3.example.com/k?X-Amz-Signature=abc123", "https://s3.example.com/k?X-Amz-Signature=[secret]"],
      ["https://maps.example.com/api?key=AIzaabc&q=x", "https://maps.example.com/api?key=[secret]&q=x"],
      ["aws_secret_access_key = abc123", "aws_secret_access_key = [secret]"],
    ];
    for (const [text, expected] of cases) expect(redact(text), text).toBe(expected);
  });

  it("passes the near misses: names that hold no secret, a flag with no value, a URL with no password", () => {
    const misses = [
      "PWD=/home/u ls",
      "sort_key=name monkey=1 max_tokens=100 token_type=bearer password_hash=x",
      "gh auth login --with-token < token.txt",
      "tool --token-file /run/t --no-password --verbose",
      "tool --password | tee",
      "Authorization: Basic",
      "https://github.com/o/r ssh://git@github.com/o/r http://localhost:8080/x",
      "the tokens of the job",
      'password=""',
    ];
    for (const text of misses) expect(findSecretShapes(text, CONTEXT_SHAPES), text).toEqual([]);
  });

  it("gives the span of the value only, in the order of the text", () => {
    const text = "a --token v1 b=1 password=v2";
    expect(findSecretShapes(text, CONTEXT_SHAPES)).toEqual([
      { shape: "secret-flag", start: 10, end: 12 },
      { shape: "secret-parameter", start: 26, end: 28 },
    ]);
  });

  /** A template of each shape, with the value in its place. */
  const TEMPLATES: readonly (readonly [string, (value: string) => string])[] = [
    ["secret-parameter", (value) => `https://h/p?x=1&access_token=${value}&y=2`],
    ["secret-parameter", (value) => `GITHUB_TOKEN=${value}`],
    ["secret-parameter", (value) => `X-Api-Key: ${value}`],
    ["secret-flag", (value) => `--password ${value}`],
    ["url-password", (value) => `git clone https://user:${value}@github.com/o/r.git`],
    ["authorization", (value) => `-H "Authorization: Bearer ${value}"`],
    ["user-password", (value) => `curl -u admin:${value} https://h`],
  ];

  /** The quoted templates. Their value can hold a space, `&` and `#`. */
  const QUOTED: readonly (readonly [string, (value: string) => string])[] = [
    ["secret-parameter", (value) => `{"clientSecret": "${value}"}`],
    ["secret-flag", (value) => `--auth-token '${value}'`],
  ];

  /** Seeded values from the letters of tokens. Each starts with `q`, which no seeded noise string has. */
  function values(seed: string, count: number): string[] {
    const r = random(seed);
    const letters = [..."ABCDEFGHJKLMNPQRSTUVWXYbcdefghijkmnopqrstuvwxyz12345678_.~+=-"];
    return Array.from({ length: count }, () => `q${Array.from({ length: r.int(7, 40) }, () => r.pick(letters)).join("")}`);
  }

  it("finds the value of each template between two seeded strings, and changes only the value", () => {
    const texts = strings("text/context-shapes/noise", 100);
    for (const text of texts) expect(findSecretShapes(text, CONTEXT_SHAPES), text).toEqual([]);
    const secrets = values("text/context-shapes/values", texts.length);
    for (const [index, before] of texts.entries()) {
      const after = texts[(index + 1) % texts.length] ?? "";
      const value = secrets[index] ?? "q";
      const cases = [
        ...TEMPLATES.map(([id, template]) => [id, template, value] as const),
        ...QUOTED.map(([id, template]) => [id, template, `${value} & #${value}`] as const),
      ];
      for (const [id, template, secret] of cases) {
        const text = `${before} ${template(secret)} ${after}`;
        const start = before.length + 1 + template(secret).indexOf(secret);
        expect(findSecretShapes(text, CONTEXT_SHAPES), text).toEqual([{ shape: id, start, end: start + secret.length }]);
        expect(redact(text)).toBe(`${before} ${template(MARK)} ${after}`);
      }
    }
  });

  it("gives the same text on a second pass", () => {
    const texts = strings("text/context-shapes/twice", 100);
    const secrets = values("text/context-shapes/twice-values", texts.length);
    for (const [index, before] of texts.entries()) {
      for (const [, template] of [...TEMPLATES, ...QUOTED]) {
        const once = redactSecretShapes(`${before} ${template(secrets[index] ?? "q")}`, { shapes: all });
        expect(redactSecretShapes(once, { shapes: all })).toBe(once);
      }
    }
  });

  it("takes the span of the group secret of a shape, and skips a match where that group is empty or does not match", () => {
    const shapes: SecretShape[] = [{ id: "k", label: "k", pattern: /k(?:=(?<secret>\d*))?/ }];
    expect(findSecretShapes("k=12 k k= x", shapes)).toEqual([{ shape: "k", start: 2, end: 4 }]);
    expect(redactSecretShapes("k=12", { shapes })).toBe(`k=${MARK}`);
  });
});

describe("isSecretName", () => {
  it("knows the names of secrets by their last word, with no case", () => {
    const names = ["GITHUB_TOKEN", "PGPASSWORD", "accessToken", "X-Api-Key", "client_secret", "MYSQL_PWD", "key", "sig", "X-Amz-Signature", "passphrase", "auth"];
    for (const name of names) expect(isSecretName(name), name).toBe(true);
    const others = ["PWD", "sort_key", "monkey", "tokens", "token_type", "password_hash", "name", "", "keys", "GITHUB_TOKEN "];
    for (const name of others) expect(isSecretName(name), name).toBe(false);
  });

  it("agrees with the shape secret-parameter for each seeded name", () => {
    const r = random("text/context-shapes/names");
    const words = ["token", "key", "api_key", "pwd", "secret", "name", "sig", "auth", "sort", "PASSWORD", "Monkey", "x"];
    for (let index = 0; index < 500; index += 1) {
      const name = Array.from({ length: r.int(1, 3) }, () => r.pick(words)).join(r.pick(["_", "-", ".", ""]));
      const found = findSecretShapes(`${name}=v`, CONTEXT_SHAPES).length > 0;
      expect(found, name).toBe(isSecretName(name));
    }
  });
});
