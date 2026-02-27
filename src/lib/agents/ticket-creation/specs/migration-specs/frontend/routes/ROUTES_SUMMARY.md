# Routes Migration Specs Summary

Generated: 2026-02-17

## Overview

This directory contains behavioral specifications for 18 route files from the Qwik e-commerce frontend.

## Route Categories

### Dynamic Routes (1)
1. **product-category.yaml** - Catch-all route for category/product pages (@categoryproduct layout)

### Informational Pages (10)
2. **payment-methods.yaml** - Payment methods information
3. **shipping-policy.yaml** - Shipping policy with data loading
4. **delivery-rates.yaml** - Interactive delivery rates with search/accordion
5. **photo-quality.yaml** - Photo quality guidelines
6. **image-resolution.yaml** - Image resolution requirements
7. **why-choose-printerpix.yaml** - Marketing/about page
8. **about-us.yaml** - Company information
9. **terms-and-conditions.yaml** - Legal terms
10. **returns-policy.yaml** - Returns/exchange policy
11. **satisfaction-guarantee.yaml** - Guarantee policy

### Utility Pages (3)
12. **track-my-order.yaml** - Order tracking
13. **contact-us.yaml** - Contact form
14. **bulk-ordering.yaml** - Bulk order inquiry form (@bulkorder layout)

### SEO/XML Routes (4)
15. **sitemap-index.yaml** - Sitemap index (server-side XML)
16. **sitemap-pages.yaml** - Pages sitemap (server-side XML)
17. **sitemap-products.yaml** - Products sitemap (server-side XML)
18. **sitemap-categories.yaml** - Categories sitemap (server-side XML)

## Key Features Documented

### Data Loading
- **routeLoader$** patterns (shipping-policy, delivery-rates, bulk-ordering)
- JSON content loading (loadWebContent)
- File system operations (sitemap routes)

### Internationalization
- **qwik-speak** integration (inlineTranslate)
- Multi-language rewrite routes (NL, DE, FR, IT, ES)
- Region-specific content variations

### Layouts
- Default layout (most routes)
- @categoryproduct layout (product-category)
- @bulkorder layout (bulk-ordering)
- No layout (XML sitemap routes)

### Region-Specific Behavior
- NL exclusions (satisfaction guarantee, help sections)
- IT exclusions (returns policy item 4)
- IN/AE exclusions (blog sitemap)
- Multi-region phone/email conditionals

## Rewrite Routes Mapping

| Route | NL | DE | FR | IT | ES |
|-------|----|----|----|----|-----|
| payment-methods | betalingsmethoden | zahlungsarten | - | modalita-di-pagamento | formas-de-pago |
| shipping-policy | bezorgmethoden | lieferbedingungen | - | politica-di-spedizione | politica-de-envio |
| delivery-rates | leveringstarieven | - | tarifs-de-livraison | tariffe-di-spedizione | entrega |
| photo-quality | fotokwaliteit | fotoqualitat | - | qualita-foto | calidad-foto |
| image-resolution | - | bildauflosung | - | risoluzione-dell-immagine | resolucion-de-imagen |
| why-choose-printerpix | waarom-printerpix | warum-printerpix | - | perche-printerpix | por-que-elegir-printerpix |
| about-us | over-ons | uber-uns | - | chi-siamo | sobre-nosotros |
| terms-and-conditions | voorwaarden | geschaftsbedingungen | - | termini-e-condizioni | terminos-y-condiciones |
| track-my-order | track-mijn-bestelling | meine-bestellung-verfolgen | - | dove-si-trova-il-mio-ordine | donde-esta-mi-orden |
| contact-us | contacteer-ons | kontaktieren-sie-uns | - | contattaci | contactos |
| returns-policy | retourneerbeleid | ruckgaberecht | - | termini-di-restituzione | cambios-y-devoluciones |
| satisfaction-guarantee | - | - | garantie-satisfaction | - | - |

## Routes with Data Dependencies

### API/Service Calls
- **delivery-rates**: getDeliveryRates() service
- **shipping-policy**: loadWebContent(SHIPPING_POLICY) JSON service
- **about-us**: getAboutUsContent() utility

### File System
- **sitemap-pages**: Reads dist/sitemap-q/{website}/sitemap-pages.xml
- **sitemap-products**: Reads dist/sitemap-q/{website}/sitemap-products.xml
- **sitemap-categories**: Reads dist/sitemap-q/{website}/sitemap-categories.xml

### Settings/Config
- **Most routes**: settings().website for region checks
- **sitemap-index**: getSiteSetting().website for origin URL

## Container Components

Many routes delegate rendering to container components:
- PaymentMethodsContainer
- PhotoQualityContainer
- ImageResolutionContainer
- TermsAndConditionsContainer
- TrackMyOrderContainer
- ContactUsContainer
- BulkOrderPage

These containers export their own Head metadata.

## Migration Notes

1. **Server-side rendering**: All routes support SSR
2. **XML routes**: Use RequestHandler (onGet) instead of component$
3. **Form handling**: bulk-ordering uses @modular-forms/qwik
4. **Image optimization**: @unpic/qwik used for responsive images
5. **State management**: delivery-rates uses useStore + useComputed$
6. **HTML content**: Some routes use dangerouslySetInnerHTML for rich content

## Test Hints

### Critical Tests
- Region-specific content variations (NL, IT, IN, AE, DE)
- Rewrite route URL handling (all localized paths)
- Data loading fallbacks (file read errors, API failures)
- Form validation (bulk-ordering)
- Accordion interaction (delivery-rates)

### Edge Cases
- Missing JSON content files
- Empty sitemap files
- Invalid region codes
- Missing i18n translations
- File system permissions (sitemap routes)

## Next Steps

1. Implement Next.js 16+ equivalents using App Router
2. Replace qwik-speak with next-intl or similar
3. Convert routeLoader$ to Next.js server components / route handlers
4. Migrate container components (separate specs needed)
5. Implement rewrites in next.config.js
6. Set up ISR for static/semi-static pages
