<!doctype html>
<html lang="{{lang}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{title}}</title>
<style>@layer luz, site;</style>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/tokens@0.5.0/dist/luz-tokens.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.5.0/dist/luz.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/chart.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/theme-time.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/navbar.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/sidebar.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/social.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/app-bar.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/dashboard.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/bar-list.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/column-chart.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/stacked-bar.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/heat-map.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/ring.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/pager.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/components/page-transition.min.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/core@0.5.0/dist/luz.min.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@luz-ds/catalog@0.5.0/dist/catalog.min.js"></script>
</head>
<body>
 <a class="luz-skip-link" href="#main-content">Skip to content</a>
 <div class="o-shell">
  <nav class="luz-sidebar" id="app-nav" aria-label="Main" popover>
   <a class="luz-sidebar__brand" href="./"><span class="luz-sidebar__brand-name">Bodega</span></a>
   <div class="luz-sidebar__section">
    <a class="luz-sidebar__link" href="./" aria-current="page">Overview</a>
   </div>
  </nav>
  <div class="o-main">
   <header class="luz-app-bar o-sticky">
    <div class="o-row">
     <button class="luz-nav-toggle" type="button" popovertarget="app-nav" aria-label="Menu"><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span><span class="luz-nav-toggle__bar"></span></button>
     <p class="luz-app-bar__product">Bodega</p>
     <div class="o-row luz-app-bar__actions">
      <div class="luz-dropdown">
       <button class="luz-btn luz-btn--ghost luz-app-bar__account" type="button" popovertarget="account-menu"><span class="luz-app-bar__account-name">Ana Ruiz</span></button>
       <div class="luz-dropdown__menu" id="account-menu" popover>
        <ul class="luz-dropdown__list"><li><a class="luz-dropdown__item" href="logout/">Sign out</a></li></ul>
       </div>
      </div>
     </div>
    </div>
   </header>
   <main class="luz-dashboard" id="main-content" tabindex="-1">
    <div class="luz-dashboard__head"><h1 class="luz-dashboard__title">Overview</h1></div>
    <ul class="o-grid o-grid--auto">
     <li class="luz-card luz-dashboard__panel"><h2 class="luz-card__title">Orders</h2><p class="luz-card__body">1,204</p></li>
     <li class="luz-card luz-dashboard__panel luz-dashboard__panel--wide">
      <h2 class="luz-card__title">Latest orders</h2>
      <div class="luz-table-wrap" role="region" aria-label="Latest orders" tabindex="0">
       <table class="luz-table">
        <thead><tr><th scope="col">Order</th><th scope="col">Total</th></tr></thead>
        <tbody><tr><td data-label="Order">INV-0042</td><td data-label="Total">120.00</td></tr></tbody>
       </table>
      </div>
     </li>
    </ul>
   </main>
  </div>
 </div>
</body>
</html>
