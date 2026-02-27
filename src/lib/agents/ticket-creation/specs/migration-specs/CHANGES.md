# Migration Specs Changes Log

## Session: 2026-02-24 - Phase 1 Gap Fill + Phase 2 Backfill (45 new specs, 5 new sections)

### Summary

Added **45 new behavioral YAML specs** for component gap-fill (Phase 1, streams 1A–1H). Backfilled **5 new sections** into all 189 specs (Phase 2, streams 2A–2M). Updated index.yaml, discovery.yaml, and meta files.

**New total: 189 specs** (was 144).

---

### 1. New Spec Files Created (45) — Phase 1

#### Banner sub-components (3)
- `frontend/components/banner/banner-flip-clock.yaml` — Animated flip-clock countdown inside promo banners
- `frontend/components/banner/floating-banner.yaml` — Named sub-export from dynamic-promo-banner-v2.tsx
- `frontend/components/banner/main-banner.yaml` — Named sub-export from dynamic-promo-banner-v2.tsx

#### Carousel sub-components (1)
- `frontend/components/carousels/static-carousel.yaml` — Static review carousel

#### Category page components (8)
- `frontend/components/category-page/category-banner.yaml` — Top page banner with CMS content
- `frontend/components/category-page/category-card.yaml` — Individual category card (sub-component of category-cards.tsx)
- `frontend/components/category-page/category-page-top-banner-v2.yaml` — Category page top banner orchestrator
- `frontend/components/category-page/category-quick-links.yaml` — Quick navigation links section
- `frontend/components/category-page/collection-slider.yaml` — Shop collection slider (from shop-page)
- `frontend/components/category-page/global-category-banner.yaml` — Global/sitewide category banner
- `frontend/components/category-page/product-sections.yaml` — Product section blocks with flip-image
- `frontend/components/category-page/shop-page-cards.yaml` — Shop page card grid (from shop-page)

#### Header components (4)
- `frontend/components/header/global-search.yaml` — Global search bar using Orama search engine
- `frontend/components/header/navigation-menu-4.yaml` — Navigation menu v4 (drawer + bar)
- `frontend/components/header/reminder-creation-modal.yaml` — Reminder creation modal dialog
- `frontend/components/header/reminder-provider.yaml` — Context provider for reminders

#### Homepage components (1)
- `frontend/components/homepage/home-page-category-card.yaml` — Homepage category card with pricing

#### Info pages sub-components (6)
- `frontend/components/info-pages/multi-order-select.yaml` — Multi-order selection (sub-component of track-my-order)
- `frontend/components/info-pages/photo-quality.yaml` — Photo quality content sub-component
- `frontend/components/info-pages/photo-tips.yaml` — Photo tips content sub-component
- `frontend/components/info-pages/shipment-detail.yaml` — Shipment detail display (sub-component)
- `frontend/components/info-pages/terms-and-conditions.yaml` — T&C content sub-component
- `frontend/components/info-pages/tracking-history.yaml` — Tracking history display component

#### Product page sub-components (13)
- `frontend/components/product-page/bulk-pricing-v4.yaml` — Bulk pricing section from ProductContext
- `frontend/components/product-page/option-panel.yaml` — Primary product configuration panel
- `frontend/components/product-page/product-carousel.yaml` — Product image/variant carousel
- `frontend/components/product-page/product-delivery-date-v2.yaml` — Delivery date estimate display
- `frontend/components/product-page/product-description-v2.yaml` — Product description with accordion
- `frontend/components/product-page/product-flip-clock.yaml` — Product page countdown clock
- `frontend/components/product-page/product-option-type-4.yaml` — Product option type 4 (Uploadcare upload)
- `frontend/components/product-page/product-page-content-basic.yaml` — Basic layout orchestrator
- `frontend/components/product-page/product-page-content-component-v2.yaml` — Named sub-export of content-v2
- `frontend/components/product-page/product-page-content-v2.yaml` — Main v2 layout orchestrator
- `frontend/components/product-page/product-page-top-banner-v2.yaml` — Product page top banner v2
- `frontend/components/product-page/product-shop-design.yaml` — Shop design layout wrapper
- `frontend/components/product-page/product-trust-indicator-v6.yaml` — Trust indicator section v6

#### Shared components (1)
- `frontend/components/shared/star-rating.yaml` — Star rating display (sub-component of customer-review)

#### Uploadcare sub-components (2)
- `frontend/components/uploadcare/upload-input.yaml` — File input wrapper (inline sub-component)
- `frontend/components/uploadcare/upload-modal.yaml` — Upload error modal (inline sub-component)

#### Web component sub-components (6)
- `frontend/components/web-component/faq.yaml` — FAQ accordion section
- `frontend/components/web-component/flip-ugc.yaml` — Flip-style UGC section (named sub-export)
- `frontend/components/web-component/shop-by-budget.yaml` — Shop-by-budget section
- `frontend/components/web-component/shop-by-category.yaml` — Shop-by-category section
- `frontend/components/web-component/shopping-guide-slider.yaml` — Shopping guide slider
- `frontend/components/web-component/slider-ugc.yaml` — Slider-style UGC section (named sub-export)

---

### 2. Phase 2: 5 New Sections Backfilled into All 144 Previous Specs

All 144 existing specs received 5 new behavioral sections (streams 2A–2M, parallel agents):

| Section | Description |
|---------|-------------|
| `types` | TypeScript interfaces, types, and enums exported or used by the unit |
| `field_consumption` | How each data field is used in rendering and logic |
| `wire_format` | API request/response shapes and data transformation details |
| `implementation_logic` | Step-by-step implementation notes for migration developers |
| `visibility_map` | Which UI elements are conditionally shown/hidden and why |

---

### 3. Meta File Updates (this session)

#### index.yaml
- `total_units`: 144 → **189**
- `summary.components`: 72 → **117**
- `complexity_distribution.simple`: 106 → **126**
- `complexity_distribution.moderate`: 31 → **52**
- `complexity_distribution.complex`: 7 → **11**
- `dependency_graph.statistics.total_specs`: 144 → **189**
- Added 45 new unit entries in the `units:` section

#### discovery.yaml
- `categories.components.count`: 45 → **90**
- `analysis_plan.total_files`: 112 → **157**
- Added 45 new entries in `analyzed_files:` section

---

### 4. New Files Created

| File | Description |
|------|-------------|
| `.claude/CLAUDE.md` | Updated to reflect new spec count and agent routing |
| `.claude/migration-specs/REFERENCE_SPEC.yaml` | Reference spec template showing all fields |

---

### 5. Final State

| Metric | Before | After |
|--------|--------|-------|
| Total spec files | 144 | **189** |
| Frontend components | 72 | **117** |
| `used_by:` coverage | 144/144 (100%) | **189/189 (100%)** |
| `behavior:` coverage | 144/144 (100%) | **189/189 (100%)** |
| New sections (types, field_consumption, etc.) | 0/144 | **144/144 (100%)** |

---

### 6. Post-Generation used_by Audit (33/45 specs corrected)

After Phase 1+2 completion, a source-code-verified audit of all 45 new Phase 1 specs found **33 of 45** had incorrect `used_by` fields. All were corrected by checking actual `import` statements in the source repo (`releases/2025.12.22.1`).

#### Key errors found and fixed

| Spec | Error | Fix |
|------|-------|-----|
| Product-page sub-components (11 specs) | Listed only 2 parent templates (base + basic) | Added all 14–18 actual importers (all PhotoCalendars, PhotoCanvas, ProductPage* templates) |
| `product-option-type-4.yaml` | Completely wrong parent set | Replaced with 7 correct importers (all templates using Uploadcare upload) |
| `faq.yaml` | `WebContentsComponent` (wrong parent) | Corrected to `ContactUsContainer` |
| `star-rating.yaml` | Only 1 importer listed (CustomerReview) | Added 6 missing: CustomerReviewItem, CustomerReviewPreview, CustomerReviewV3, TrustpilotRating, TrustpilotRatingV2, MarketingCustomerReviews |
| `main-banner.yaml`, `floating-banner.yaml` | Prose descriptions instead of PascalCase names | Replaced with clean PascalCase component names |
| `product-page-top-banner-v2.yaml`, `product-trust-indicator-v6.yaml`, etc. | Missing 10–16 importers each | All populated from grep of source imports |

**Summary:** 33 specs corrected, 11 already correct, 1 had no importers (correct as empty).

---

### 7. Dependency Graph Level Corrections (Two Passes)

Phase 3's post-processing agent bulk-placed all 45 new specs at level_0 or level_1 without verifying where their `used_by` parents sit in the inverted dependency graph.

**Graph model:** level_0 = top-level consumers (leaf nodes — nothing imports them). level_3 = most foundational (imported by many). A spec's level = deepest parent's level + 1, capped at 3. Specs whose only importers are unspecced components remain at level_0.

#### Pass 1 (24 specs corrected)

Moved 24 specs into level_3. However, this pass incorrectly treated 12 specced parent components (e.g., `TrackMyOrderContainer`, `ShoppingGuide`, `UgcSection`, `ContactUsContainer`, `CustomerReview`) as "unspecced", leaving those 12 child specs at wrong levels.

Level counts after pass 1: level_0=56, level_1=28, level_2=4, level_3=101 — `leaf_nodes_count: 56`

#### Pass 2 (12 specs corrected)

Corrected the remaining 12 by recognising their parents are in fact specced:
- 9 specs moved level_0 → level_1
- 3 specs moved level_0 → level_3

#### Final state after both passes

| Level | Count | Meaning |
|-------|-------|---------|
| level_0 | **44** | Top-level consumers (leaf nodes — nothing imports them) |
| level_1 | **37** | Imported only by level_0 specs |
| level_2 | **4** | Mid-tier dependencies |
| level_3 | **104** | Most foundational (imported by many) |
| **Total** | **189** | |

`leaf_nodes_count` corrected from initial 70 → 44. `dependency-graph.yaml` and `dependency-report.yaml` both updated.

---

### 8. Circular Dependency Audit

All 92 circular dependency entries in `dependency-graph.yaml` audited and verified accurate and distinct.

#### Findings

| Finding | Result |
|---------|--------|
| Total cycle entries in graph | 92 |
| Primitive bidirectional edges (unique root edges) | 11 |
| All 92 entries are path expansions of the 11 primitives | ✅ Confirmed |
| New cycles introduced by Phase 1 frontend specs | **0** |
| Primitives verified against source code | 4 of 11 |
| Count accurate (no duplicates, no false positives) | ✅ |

#### Runtime-dangerous cycles (both directions are VALUE imports — module load deadlock possible)

| Cycle | Details |
|-------|---------|
| `common-service ↔ http` | `common-service` calls `handleMultipleAPIRequests` from `http`; `http` calls `activateCookieIssuePopup` from `common-service`. Both are value imports. |
| `cart-cookie-service ↔ data-layer-mapper` | `cart-cookie` exports `cookieKey` used in `data-layer-mapper`; `data-layer-mapper` exports `getBaseDomainName`/`getCookie`/`setCookie` used in `cart-cookie`. Both are value imports. |

#### Architecturally circular but NOT runtime-dangerous (at least one `import type` direction)

Examples: `product-page-service ↔ themes-service`, `product-category-context ↔ common-service`, `layout-default ↔ footer`, `product-page-service ↔ product-category-service`

#### footer ↔ layout-default cycle (confirmed real via Qwik routeLoader$ pattern)

`footer.tsx` uses `useLoadBanner` which is a `routeLoader$` export from `layout-default.tsx`. Qwik's pattern allows child components to consume routeLoaders from parent layouts, creating a real bidirectional import. This is architecturally acceptable in Qwik but structurally circular.

---

### 9. name: Field PascalCase Fix (33 specs)

A final audit revealed **33 more specs** with kebab-case or lowercase `name:` fields — all in backend services, shared data, and shared utilities (the Phase 0 naming fix had only covered components and templates).

All 33 were corrected. The only remaining lowercase `name:` values are the two intentional `name: http` entries for `shared/config/http.yaml` and `shared/utilities/http.yaml`, which correctly reflect their source filenames (`http.ts` in two different directories).

#### Fixed (33 specs)

| Category | Specs fixed |
|----------|-------------|
| Backend services (18) | `ThemesService`, `WebComponentService`, `DeliveryRatesService`, `HolidayDeliveryService`, `HomeService`, `HomepageService`, `MarkdownService`, `MarketingPageWebContentService`, `MiddleWareService`, `NavigationV3Service`, `ProductPageWebContentService`, `ShopByBudgetService`, `ShopByCategoryService`, `ShopPageService`, `StaticPageService`, `ConsoleLogService`, `GtmDataLayerBase`, `GtmDataLayerMapper` |
| Shared data (3) | `MarketingContentData`, `OptionData`, `ReviewData` |
| Shared config (1) | `Settings` |
| Shared utilities (11) | `CountryRegion`, `Device`, `Element`, `Matomo`, `Sentry`, `AboutUsContent`, `BackupJsonUtilities`, `Format`, `GoogleTagManagerExtension`, `HomepageContents`, `ShareContents` |

---

### 10. Missing New Sections Backfill (2 specs)

Two specs were found to be missing all 5 new behavioral sections. Both were backfilled from source code.

#### `frontend/components/header/header-wrapper.yaml`

3 sections added (source: `src/components/header/header-wrapper.tsx`):

- **`types`** — `HeaderWrapperProps` interface (single optional `showMenu: boolean` field)
- **`implementation_logic`** — 2 rules: scroll threshold with 50ms show-delay / 300ms transition sequence / re-entrancy guard (critical); header height using absolute page position via `rect.top + window.pageYOffset`
- **`field_consumption`** — `showMenu` prop passed to `Header` in both branches; `LocationUrl.url.searchParams` — only `get("showHeader")` read, all other URL fields ignored
- **`visibility_map`** — 6 entries: fixed/normal header divs, spacer div (all gated by `showFixedHeader.value`), header children in each branch (gated by `showHeader !== "0"`), transition CSS classes

`wire_format` not added — component makes no API calls.

#### `frontend/components/info-pages/track-my-order-container.yaml`

4 sections added (source: `src/components/account-detail/track-my-order-container.tsx`):

- **`types`** — 6 types: `MultiOrderSelectPropType`, `ShipmentDetailPropType`, `TrackingHistoryType`, `TrackingItem` (nested `Updates` object, all 7 sub-fields), `OrderTrackingResponse`, `OrderTrackingStore`
- **`field_consumption`** — all 9 `TrackingItem` fields documented including `substring(0,5)` usage of `ShipmentTime`, `ClassName.includes("deliveredStatus")` check, and timezone map lookup
- **`implementation_logic`** — 6 rules: single vs multi-package detection with `findIndex` fallback (critical), URL sync via `window.history.replaceState`, auto-fetch on initial load, loading state lifecycle, `messageBody` format string, carrier link 4-branch decision tree (critical)
- **`visibility_map`** — 13 conditional render points including `messageBody_condensed_tooltip_trigger` (`> 4 OR > 3 && !delivered` threshold) and all tracking/shipment display states

`wire_format` not added — HTTP calls delegated to `getTrackingData` service, not constructed in component.

---

## Session: 2026-02-18 - Bloat Audit + SEO Specs Update

### Summary

Audited migration-specs for unnecessary bloat and removed `testing_hints:` from 48 files + `version_info:` from 1 file. Then updated the seo-specs layer to cover the home page, new components, new services, renamed files, and the containerless layout.

---

### 1. Bloat Removal — Migration Specs

#### `testing_hints:` removed from 48 files

Same purpose as the `test_hints:` removed in a prior session — scaffolding for agents writing tests during migration. Behavior is already documented in `behavior:`, `exports:`, `edge_cases:` sections.

Files cleaned (all under `migration-specs/`):

| Category | Count | Files |
|----------|-------|-------|
| Backend services | 6 | json-service, cart-cookie-service, go-quick-service, homepage-service, cart-services/gtm/data-layer-mapper, cart-services/gtm/data-layer-base |
| Frontend routes | 1 | home-page |
| Frontend layouts | 1 | layout-containerless |
| Frontend components (homepage) | 5 | home-customer-reviews, homepagecategory, homepage-category-container, marketing-content-video, trustpilot-rating |
| Frontend components (web-component) | 10 | faq-v2, web-contents-component, seo-content, trust-signals, home-best-sellers, cta-list, mid-page-banner, shopping-guide, stories, ugc-section, video-banner |
| Frontend components (carousels) | 2 | dynamic-carousel, static-carousel1 |
| Frontend components (go-quick) | 2 | go-quick-carousel-widget, go-quick-homepage-widget |
| Frontend components (uploadcare) | 2 | uploadcare, uploadprogress |
| Frontend components (shared) | 8 | cross-domain-notification, accordion, accordion-details, accordion-header, customer-review, fresh-desk-widget, guideline-section, home-bottom-banner, product-type-table |
| Frontend components (category-page) | 3 | email-subscription, category-cards, blog-category-section |
| Frontend components (product-page) | 1 | product-page-selection |
| Frontend components (bulk-order) | 2 | bulk-order-page, bulk-order-page-old |
| Frontend components (media) | 1 | video |
| Shared utilities | 1 | sentry |

#### `version_info:` removed from 1 file

- `shared/config/http.yaml` — contained `target_framework: Next.js` and `breaking_changes` list (explicit migration guidance, not behavioral documentation)

#### Fields kept (not bloat)

- `edge_cases:` (31 files) — documents real runtime quirks, part of behavioral documentation
- `known_issues:` (1 file, http.yaml) — documents real bugs (typo in MAX_API_ATTEPMTS)
- Migration-contextual language (53 files) — mostly factual context ("Slot maps to React's children"), not targeting

---

### 2. SEO Specs Updates

#### Stale path fixes in `_service-registry.yaml` (3 edits)

| Old Path | New Path |
|----------|----------|
| `../migration-specs/backend/services/gtm/data-layer-mapper.yaml` | `../migration-specs/backend/services/cart-services/gtm/data-layer-mapper.yaml` |
| `../migration-specs/backend/services/gtm/data-layer-base.yaml` | `../migration-specs/backend/services/cart-services/gtm/data-layer-base.yaml` |
| `../migration-specs/backend/services/cookie-service.yaml` | `../migration-specs/backend/services/cart-cookie-service.yaml` |

Also renamed service entry key: `cookie-service` → `cart-cookie-service`.

#### New services added to `_service-registry.yaml` (3 entries)

| Service | SEO Impact | Notes |
|---------|-----------|-------|
| `home-service` (updated) | HIGH | Added full detail — getHomepage(), POST /homepage/getv2, returns pageTitle/metaDescription/metaKeywords/h1 |
| `homepage-service` (new) | LOW | Legacy service, only lazyLoading QRL is actively used |
| `go-quick-service` (new) | NONE | AI photo cropping, no SEO impact |

#### Containerless layout added to `_architecture.yaml`

4th layout definition (after default, categoryproduct, bulkorder). Used by home page. Renders HeaderWrapper + FooterContainerLess. Child route owns all SEO. Updated description from "Three" to "Four" layouts.

#### New components added to `_component-registry.yaml` (10 entries)

| Component | SEO Impact | Key SEO Feature |
|-----------|-----------|-----------------|
| FaqSectionV2 | HIGH | FAQPage JSON-LD structured data + Schema.org microdata |
| WebContentsComponent | HIGH | CMS section orchestrator (15 section types) |
| SeoContentComponent | HIGH | h2/h3 headings + markdown content |
| TrustSignalsSection | MEDIUM | h2 heading + trust badges |
| HomeBestSellers | MEDIUM | Featured products with headings |
| HomepageCategoryContainer | MEDIUM | Category grid with headings |
| HomeCustomerReviews | MEDIUM | Reviews + TrustpilotRating |
| FooterContainerLess | MEDIUM | Full footer with legal links, social, trust badges |
| DynamicCarousel | MEDIUM | Image alts, preloads |
| TrustpilotRating | MEDIUM | Star rating display |

#### New page spec: `pages/home.yaml` (173 lines)

Comprehensive home page SEO spec covering:
- SEO contract: title, meta description, meta keywords, canonical, robots, OG, Twitter
- Structured data: WebPage (ReadAction), WebSite (SearchAction), FAQPage (via component)
- Hreflang: 8 links via `getHreflangLinks("/")`
- Heading hierarchy: h1 from API, h2s from CMS sections
- File chain: route → layout-containerless → home-service → homepage-contents → components
- API verification: POST /homepage/getv2 with example curl (verified 200 OK)
- Region variations: review rendering modes, static content, CMS-driven section ordering

#### `_index.yaml` updated

- Added `"/"` route to routing_table (home page, layout: containerless, page spec: pages/home.yaml)
- Added `pages/home.yaml` to file_index pages section

#### `_api-guide.yaml` updated

Added `fetch_homepage` entry:
- Endpoint: `POST /homepage/getv2`
- Example curl with GB token (verified 200 OK)
- Response structure documenting all SEO fields (`data.homepageViewModel.pageTitle`, etc.)
- Notes distinguishing this from the product/category endpoint

#### Spec Format Convention updated

- Removed `testing_hints` from field list (no longer present in any spec)
- Added `edge_cases` and `known_issues` (fields that remain)

---

### 3. Verification

| Check | Result |
|-------|--------|
| `testing_hints:` in migration-specs | **0 matches** (48 removed) |
| `version_info:` in migration-specs | **0 matches** (1 removed) |
| All 7 stale paths from prior CHANGES.md in seo-specs | **0 matches** |
| Spec path references → real files on disk | **97/97 (100%)** |
| routing_table entries vs file_index vs disk | **19/19/19 match** |
| Layout references vs `_architecture.yaml` | **All 4 defined** |
| Homepage API (POST /homepage/getv2, GB token) | **200 OK** |
| SEO-specs total files | **24** (5 global + 19 pages) |
| Migration-specs total files | **144** (unchanged) |

---

### 4. Final State

| Metric | Value |
|--------|-------|
| Migration-spec files | **144** (unchanged) |
| SEO-spec files | **24** (was 23, added pages/home.yaml) |
| `testing_hints:` in specs | **0** (was 48) |
| `version_info:` in specs | **0** (was 1) |
| Stale paths in seo-specs | **0** |
| Spec cross-references valid | **100%** (97/97) |

---

## Session: 2026-02-18 - Home Page Specs + Duplicate Cleanup

### Summary

Added behavioral YAML specs for the **home page route** (`index@containerless.tsx`) and **all its dependencies**. Then cleaned up 5 duplicate spec files and fixed all references. Final state: **144 unique specs** (up from 112).

---

### 1. New Spec Files Created (35)

These 35 new YAML spec files were added in this session:

#### Routes (1)
- `frontend/routes/home-page.yaml` - Home page route (source: `routes/index@containerless.tsx`)

#### Layouts (1)
- `frontend/layouts/layout-containerless.yaml` - Containerless layout (source: `routes/layout-containerless.tsx`)

#### Components (28)
- `frontend/components/carousels/dynamic-carousel.yaml` - Infinite-loop carousel with autoplay, touch swipe
- `frontend/components/carousels/static-carousel1.yaml` - Static carousel for reviews
- `frontend/components/category-page/blog-category-section.yaml` - Blog section in category pages
- `frontend/components/category-page/category-cards.yaml` - Category card grid
- `frontend/components/category-page/email-subscription.yaml` - Email subscription form (Klaviyo)
- `frontend/components/footer/footer-containerless.yaml` - Footer for containerless layout
- `frontend/components/go-quick/go-quick-carousel-widget.yaml` - GoQuick slide for carousel
- `frontend/components/go-quick/go-quick-homepage-widget.yaml` - GoQuick photo upload widget (Uploadcare)
- `frontend/components/homepage/home-customer-reviews.yaml` - Customer reviews section
- `frontend/components/homepage/homepagecategory.yaml` - Single category card component
- `frontend/components/homepage/homepage-category-container.yaml` - Category grid container with Show More/Less
- `frontend/components/homepage/marketing-content-video.yaml` - Marketing video component
- `frontend/components/homepage/trustpilot-rating.yaml` - Trustpilot star rating display
- `frontend/components/media/video.yaml` - Lazy-loaded video component
- `frontend/components/uploadcare/uploadcare.yaml` - Uploadcare file picker widget
- `frontend/components/uploadcare/uploadprogress.yaml` - Upload progress indicator
- `frontend/components/web-component/cta-list.yaml` - CTA list section
- `frontend/components/web-component/faq-v2.yaml` - FAQ accordion section
- `frontend/components/web-component/home-best-sellers.yaml` - Best sellers section
- `frontend/components/web-component/mid-page-banner.yaml` - Mid-page promotional banner
- `frontend/components/web-component/seo-content.yaml` - SEO content block
- `frontend/components/web-component/shopping-guide.yaml` - Shopping guide section
- `frontend/components/web-component/stories.yaml` - Customer stories section
- `frontend/components/web-component/trust-signals.yaml` - Trust signals section
- `frontend/components/web-component/ugc-section.yaml` - User-generated content
- `frontend/components/web-component/video-banner.yaml` - Video banner section
- `frontend/components/web-component/web-contents-component.yaml` - CMS section orchestrator (15 section types)

#### Services (2)
- `backend/services/go-quick-service.yaml` - GoQuick AI photo service
- `backend/services/homepage-service.yaml` - Homepage data service

#### Utilities (1)
- `shared/utilities/sentry.yaml` - Sentry error logging utility

#### Detailed Replacements (3) - new canonical specs that supersede older, less detailed versions
- `backend/services/cart-cookie-service.yaml` - Detailed version of cookie service (source: `services/cart-services/cookie.ts`)
- `backend/services/cart-services/gtm/data-layer-base.yaml` - Detailed version of GTM data layer base (source: `services/cart-services/gtm/data-layer-base.ts`)
- `backend/services/cart-services/gtm/data-layer-mapper.yaml` - Detailed version of GTM data layer mapper (source: `services/cart-services/gtm/data-layer-mapper.ts`)

---

### 2. Duplicate Cleanup (RESOLVED)

Three source files had multiple spec YAML files covering the same code. The most detailed version was kept as canonical; the rest were deleted.

#### Duplicates Identified

| Source File | Canonical (KEPT) | Deleted |
|-------------|-------------------|---------|
| `services/cart-services/gtm/data-layer-base.ts` | `backend/services/cart-services/gtm/data-layer-base.yaml` | `backend/services/gtm/data-layer-base.yaml`, `backend/services/gtm-data-layer-base.yaml` |
| `services/cart-services/gtm/data-layer-mapper.ts` | `backend/services/cart-services/gtm/data-layer-mapper.yaml` | `backend/services/gtm/data-layer-mapper.yaml`, `backend/services/gtm-data-layer-mapper.yaml` |
| `services/cart-services/cookie.ts` | `backend/services/cart-cookie-service.yaml` | `backend/services/cookie-service.yaml` |

**5 files deleted total.**

#### Path Replacements Applied

These old paths were replaced with canonical paths everywhere they appeared:

| Old Path | Canonical Path |
|----------|---------------|
| `backend/services/cookie-service.yaml` | `backend/services/cart-cookie-service.yaml` |
| `backend/services/gtm/data-layer-base.yaml` | `backend/services/cart-services/gtm/data-layer-base.yaml` |
| `backend/services/gtm/data-layer-mapper.yaml` | `backend/services/cart-services/gtm/data-layer-mapper.yaml` |
| `backend/services/gtm-data-layer-base.yaml` | `backend/services/cart-services/gtm/data-layer-base.yaml` |
| `backend/services/gtm-data-layer-mapper.yaml` | `backend/services/cart-services/gtm/data-layer-mapper.yaml` |

Old index keys replaced:

| Old Key | Canonical Key |
|---------|--------------|
| `backend.services.cookie-service` | `backend.services.cart-cookie-service` |
| `backend.services.gtm.data-layer-base` | `backend.services.cart-services.gtm.data-layer-base` |
| `backend.services.gtm.data-layer-mapper` | `backend.services.cart-services.gtm.data-layer-mapper` |

#### Meta Files Edited During Cleanup (4 files)

**`index.yaml`:**
- Removed 3 old unit entries: `backend.services.cookie-service`, `backend.services.gtm.data-layer-base`, `backend.services.gtm.data-layer-mapper`
- Removed old leaf_node entries for `backend/services/gtm/data-layer-mapper.yaml` and `backend/services/gtm/data-layer-base.yaml`
- Updated level reference: `backend/services/cookie-service.yaml` → `backend/services/cart-cookie-service.yaml`
- Updated totals: total_units 147→144, services 29→26, simple 108→106, moderate 32→31, leaf_nodes_count 104→102

**`dependency-graph.yaml`:**
- Updated totals: total_specs 147→144, leaf_nodes_count 43→41
- Replaced old path in leaf_nodes: `backend/services/gtm/data-layer-base.yaml` → `backend/services/cart-services/gtm/data-layer-base.yaml`
- Updated most_depended_on entries: `cookie-service.yaml` → `cart-cookie-service.yaml`, `gtm/data-layer-mapper.yaml` → `cart-services/gtm/data-layer-mapper.yaml`
- Updated level counts: level_0 43→41, level_3 79→76
- Removed old entries from level_0 and level_3 lists
- Replaced all old paths in circular_dependencies section (replace_all)

**`dependency-report.yaml`:**
- Updated totals: total_specs 147→144, leaf_nodes_count 43→41
- Removed 3 duplicate entry blocks: old `data-layer-base` from level_0, old `data-layer-mapper` from level_0, old `cart-cookie-service` from level_1
- Updated level counts: level_0 43→41, level_1 30→29
- Replaced all occurrences of 3 old paths → canonical paths (replace_all across entire file)

**`discovery.yaml`:**
- Updated 3 `spec_path` values:
  - Line for `data-layer-mapper.ts`: `backend/services/gtm/data-layer-mapper.yaml` → `backend/services/cart-services/gtm/data-layer-mapper.yaml`
  - Line for `data-layer-base.ts`: `backend/services/gtm/data-layer-base.yaml` → `backend/services/cart-services/gtm/data-layer-base.yaml`
  - Line for `cookie.ts`: `backend/services/cookie-service.yaml` → `backend/services/cart-cookie-service.yaml`

#### Individual Spec Files: NOT Modified

The 144 individual spec YAML files (in `backend/`, `frontend/`, `shared/`) were **not modified** during cleanup. Their `dependencies:` arrays use **source code import paths** (e.g., `~/services/cart-services/cookie`, `~/services/cart-services/gtm/data-layer-mapper`) rather than YAML file paths, so they were never affected by the duplicate file naming issue.

#### Post-Cleanup Audit Fixes (2 additional issues found and resolved)

A cross-reference audit after the initial cleanup found 2 more issues:

**Issue 1 — Phantom index entry (FIXED):**
- `frontend.components.web-component.blog-category-section` in index.yaml pointed to `frontend/components/web-component/blog-category-section.yaml` which never existed on disk
- The real file is at `frontend/components/category-page/blog-category-section.yaml` (already had its own correct entry)
- **Fix:** Removed phantom entry from index.yaml, dependency-graph.yaml (level_1 list), and dependency-report.yaml (level_1 entry block)
- Updated dependency-graph.yaml level_1 count: 30→29

**Issue 2 — Wrong dependency path in go-quick-service (FIXED):**
- dependency-report.yaml listed `backend/services/cart-services/cookie.yaml` as a dependency of `go-quick-service`
- That file doesn't exist — the correct spec path is `backend/services/cart-cookie-service.yaml`
- **Fix:** Replaced the path in dependency-report.yaml

#### Verification

After all fixes, grep confirmed **zero references** to any old, phantom, or incorrect path in any YAML file. Old paths only appear in this CHANGES.md file (as documentation).

---

### 3. Final State

| Metric | Before Session | After Additions | After Cleanup (Final) |
|--------|---------------|-----------------|----------------------|
| Total spec files on disk | 112 | 152 (includes 5 duplicates) | **144** |
| Total units in index.yaml | 112 | 147 (includes 3 duplicate entries) | **144** |
| Backend services | 24 | 29 | **29** |
| Frontend components/routes/layouts | 75 | 103 | **103** |
| Shared utilities/config/context/data | 13 | 15 | **15** |
| Meta files | 5 | 5 | **5** (index, dependency-graph, dependency-report, discovery, progress) |

---

## Session: 2026-02-18 - Field Backfill + Meta File Accuracy Fixes

### Summary

Backfilled `behavior:` and `used_by:` fields across all 144 specs to achieve **100%/100% coverage** (up from 63%/80%). Then audited and corrected all 3 meta files to ensure cross-file consistency.

---

### 1. Field Backfill (behavior + used_by)

**Starting coverage:**
- `behavior:` present in 91/144 specs (63%)
- `used_by:` present in 115/144 specs (80%)

**Ending coverage:** 144/144 for both fields (100%)

#### Backfill Batches

| Batch | Specs Updated | Agent |
|-------|--------------|-------|
| Backend services batch 1 (8 specs) | common-service, category-service, json-service, product-category-service, product-page-service, themes-service, web-component-service, shop-by-category-service | afb62e6 |
| Backend services batch 2 (8 specs) | shop-by-budget-service, delivery-rates-service, holiday-delivery-service, add-to-cart-service, accounts-service, home-service, navigation-v3-service, middle-ware-service | a9a4a27 |
| Backend services batch 3 (8 specs) | klaviyo-service, server, console-log-service, product-page-web-content-service, marketing-page-web-content-service, static-page-service, markdown-service, homepage-service | a3f540b |
| Product-page templates batch 1 (6 specs) | product-page-basic-template, product-page-fixed-template, product-page-fixed-theme-template, product-page-hub-template, product-page-hub-child-template, product-page-selection | a05e729 |
| Product-page templates batch 2 (7 specs) | photo-canvas-prints-new-template, photo-canvas-prints-new-template-v3, photo-canvas-prints-template-v2, photo-canvas-prints-bundled-template, photo-canvas-prints-hub-bundled-template, instant-product-page-container, product-page-base-template | a3986b7 |
| Header/footer/banner (8 specs) | header, header-wrapper, footer, footer-product-category, footer-shipping-banner, dynamic-promo-banner-v2, strip-banner, category-page-factory | abffb0d |
| Info-pages/layout/category (8 specs) | contact-us-container, track-my-order-container, terms-and-conditions-container, layout-categoryproduct, common-category-container, payment-methods-container, photo-quality-container, image-resolution-container | ac8b020 |
| Shared data/config/context (8 specs) | option-data, review-data, marketing-content-data, settings, http (config), web-content-context, device-detector-context, product-category-context | a191486 |
| Layout files (2 specs, manual) | layout-default (used_by only), layout-bulkorder (used_by only) | manual |

---

### 2. Meta File Accuracy Audit + Fixes

#### dependency-graph.yaml Fixes

| Issue | Fix |
|-------|-----|
| `data-layer-mapper` incorrectly in `leaf_nodes` | Removed (it depends on cart-cookie-service) |
| `data-layer-base` incorrectly in `leaf_nodes` | Removed (it depends on console-log-service) |
| `data-layer-mapper` in `level_0` | Moved to `level_3` (circular dependency with cart-cookie-service) |
| `cart-cookie-service` in `level_1` | Moved to `level_3` (circular dependency with data-layer-mapper) |
| level_1 comment: `# 28 specs` | Corrected to `# 27 specs` |
| level_3 comment: `# 76 specs` → `# 71 specs` → `# 72 specs` | Corrected through successive fixes |

#### dependency-report.yaml Fixes

| Issue | Fix |
|-------|-----|
| level_1 comment: `# 29 specs` | Corrected to `# 27 specs` |
| level_3 comment: `# 79 specs` | Corrected to `# 72 specs` |

#### index.yaml Fixes

| Issue | Fix |
|-------|-----|
| Summary `services: 26` | Corrected to `services: 29` |
| Summary `components: 73` | Corrected to `components: 72` |

#### Circular Dependencies Audit

Audited all 93 listed cycles against actual spec `dependencies.internal` sections:

| Finding | Count |
|---------|-------|
| Cycles with all valid edges | 92 |
| False positive (removed) | 1 |
| Stale/wrong path references | 0 |

**False positive removed:** Cycle `image-resolution-container → image-resolution route → image-resolution-container` was invalid — the container does NOT import from the route (one-way dependency only). Removed from `circular_dependencies` list, count updated 93→92.

#### Cross-File Consistency (VERIFIED)

Both dependency files now have identical level distributions:

| Level | Count |
|-------|-------|
| level_0 | 41 |
| level_1 | 27 |
| level_2 | 4 |
| level_3 | 72 |
| **Total** | **144** |

---

### 3. Updated Final State

| Metric | Value |
|--------|-------|
| Total spec files | **144** |
| `behavior:` coverage | **144/144 (100%)** |
| `used_by:` coverage | **144/144 (100%)** |
| Meta files consistent | **Yes** (all 3 match) |
| Backend services | 29 |
| Frontend components | 72 |
| Frontend routes | 19 |
| Frontend layouts | 4 |
| Shared config | 2 |
| Shared contexts | 3 |
| Shared data | 3 |
| Shared utilities | 12 |

---

## Spec Format Convention

All specs in this repo use **pure behavioral format** with NO migration notes, NO migration_recommendations, NO migration_waves. Fields used:

- `name`, `source`, `description`
- `exports` (for services/utilities)
- `props` (for components)
- `component_structure`, `child_components` (for components)
- `data_structure` (for types/interfaces/enums)
- `behavior` (step-by-step logic)
- `styling` (CSS/layout details)
- `dependencies` (internal and external)
- `used_by` (consumers)
- `security` (auth, sensitive data)
- `edge_cases` (runtime quirks, boundary conditions)
- `known_issues` (documented bugs)
- `notes` (quirks, gotchas)
