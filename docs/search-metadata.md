# 검색 제외 및 링크 공유 정보

- `src/app/layout.tsx`의 모든 하위 페이지가 `noindex, nofollow` 메타 태그를 상속합니다.
- `next.config.ts`는 모든 경로에 `X-Robots-Tag: noindex, nofollow`를 적용합니다. 로그인, 초대, 비밀번호 재설정, 오류 페이지와 정적 자산에도 적용해야 합니다.
- `src/app/robots.ts`는 크롤링을 허용합니다. robots.txt에서 차단하면 검색 엔진이 noindex를 읽을 수 없어 기존 검색 결과가 남을 수 있습니다. noindex는 접근 권한 검사가 아니며 기존 인증·API 권한 검사는 그대로 유지합니다.
- 제목: `치카픽 어드민 - 서비스 운영 관리`
- 설명: `치과와 회원 정보, 예약 현황, 콘텐츠와 고객 문의를 관리하는 치카픽 운영자 전용 서비스입니다.`
- 검색 아이콘 `src/app/icon.png`는 Client의 144px iOS 앱 아이콘입니다. 기본 Next.js `favicon.ico`는 제거했습니다. 공유/터치 이미지 `public/images/chikapick_app_icon.png`는 Client의 앱 아이콘에서 생성한 512px 웹 이미지입니다.
- Open Graph/Twitter는 위 문구와 이미지를 공유하고 운영 주소 `https://admin.chikapick.com`을 기준으로 이미지 절대 주소를 생성합니다.

배포 후 루트·초대·비밀번호 재설정·없는 경로의 응답 헤더, HTML 메타 태그, robots.txt 및 이미지 응답을 확인합니다. 검색 결과에서 사라지는 시점은 검색 엔진 재수집에 달려 있습니다. 빠른 제거가 필요하면 해당 사이트 Search Console 소유자가 삭제 요청 도구를 사용합니다.

근거: [Google noindex 안내](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
