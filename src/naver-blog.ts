import fs from "node:fs";
import path from "node:path";

export type NaverBlogVisibility = "public" | "private";

export interface NaverBlogPostOptions {
  // If provided, we can jump directly to the blog write form.
  blogId?: string;

  title: string;
  content: string;

  category?: string;
  tags?: string[];
  visibility?: NaverBlogVisibility;
  images?: string[];

  // Safety: default is false (stop before final publish click)
  publish?: boolean;
}

function toAbsPaths(paths: string[], baseDir: string): string[] {
  return paths
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (path.isAbsolute(p) ? p : path.resolve(baseDir, p)));
}

export function loadNaverBlogPostOptionsFromJson(jsonPath: string): NaverBlogPostOptions {
  const absPath = path.isAbsolute(jsonPath) ? jsonPath : path.resolve(process.cwd(), jsonPath);
  const raw = fs.readFileSync(absPath, "utf-8");
  const opts = JSON.parse(raw) as Partial<NaverBlogPostOptions>;

  if (!opts.title || !opts.content) {
    throw new Error("Invalid JSON: title/content are required");
  }

  const baseDir = path.dirname(absPath);
  const images = Array.isArray(opts.images) ? toAbsPaths(opts.images, baseDir) : undefined;

  return {
    blogId: opts.blogId,
    title: String(opts.title),
    content: String(opts.content),
    category: opts.category ? String(opts.category) : undefined,
    tags: Array.isArray(opts.tags) ? opts.tags.map(String) : undefined,
    visibility: opts.visibility === "private" ? "private" : opts.visibility === "public" ? "public" : undefined,
    images,
    publish: Boolean(opts.publish),
  };
}

export function buildNaverBlogWriteMission(opts: NaverBlogPostOptions): string {
  const tags = (opts.tags || []).filter(Boolean);
  const images = (opts.images || []).filter(Boolean);
  const visibility = opts.visibility || "public";

  const lines: string[] = [];

  lines.push("네이버 블로그에 새 글을 작성해.");
  lines.push("중요: 로그인은 이미 되어있는 Chrome 프로필을 사용해야 해. 로그인 페이지가 나오면 로그인 완료 후 계속 진행해.");
  lines.push("중요: 반드시 browser_navigate -> browser_snapshot -> 상호작용 순서로 진행해.");
  lines.push("파일 업로드가 필요하면 browser_upload 도구를 사용해.");
  lines.push("");

  if (opts.blogId) {
    lines.push(`1) 글쓰기 화면으로 이동: https://blog.naver.com/${opts.blogId}/postwrite 또는 글쓰기 버튼을 찾아 들어가.`);
  } else {
    lines.push("1) https://blog.naver.com 으로 이동해서 '글쓰기' 또는 '새 글' 버튼을 찾아 글쓰기 화면으로 들어가.");
  }

  lines.push("2) 에디터(스마트에디터/새 에디터)에서 제목과 본문을 입력해.");
  lines.push(`   - 제목: ${opts.title}`);
  lines.push("   - 본문: 아래 내용을 그대로 붙여넣기");
  lines.push("-----본문 시작-----");
  lines.push(opts.content);
  lines.push("-----본문 끝-----");

  if (opts.category) {
    lines.push("");
    lines.push("3) 카테고리를 설정해.");
    lines.push(`   - 카테고리: ${opts.category}`);
    lines.push("   - 카테고리 메뉴/드롭다운을 열고 위 이름과 일치(또는 가장 근접)한 항목을 선택해.");
  }

  if (tags.length > 0) {
    lines.push("");
    lines.push("4) 태그를 추가해.");
    lines.push(`   - 태그: ${tags.join(", ")}`);
    lines.push("   - 태그 입력칸에 태그를 하나씩 입력하고 Enter로 확정해.");
  }

  if (images.length > 0) {
    lines.push("");
    lines.push("5) 이미지를 본문에 첨부해.");
    lines.push("   - 에디터의 '사진/이미지' 버튼을 눌러 업로드를 진행해.");
    lines.push("   - 업로드 입력이 file input이면 해당 selector로 browser_upload를 호출해.");
    lines.push("   - 업로드 버튼이 파일 선택창을 띄우면, 그 버튼 selector로 browser_upload를 호출해(chooser 방식).");
    lines.push(`   - 업로드할 이미지 경로: ${images.join(" | ")}`);
  }

  lines.push("");
  lines.push("6) 공개 설정을 확인/변경해.");
  lines.push(`   - 공개 범위: ${visibility === "private" ? "비공개" : "전체공개"}`);
  lines.push("   - '공개'/'비공개'/'공개설정' 같은 메뉴에서 올바르게 설정되어 있는지 확인해.");

  lines.push("");
  lines.push("7) 발행/등록 화면까지 진행해.");
  if (opts.publish) {
    lines.push("   - 최종 확인(발행 버튼)이 있으면 눌러서 실제 발행까지 완료해.");
  } else {
    lines.push("   - 안전을 위해 최종 '발행' 버튼은 누르지 말고, 발행 직전 화면에서 멈춰서 현재 상태를 요약해.");
    lines.push("   - 가능하면 임시저장/저장 버튼이 있으면 임시저장해.");
  }

  lines.push("");
  lines.push("완료 후에는: 글쓰기 화면 상태(발행 여부/임시저장 여부), 설정된 카테고리/태그/공개범위, 업로드된 이미지 유무를 한국어로 요약해.");

  return lines.join("\n");
}
