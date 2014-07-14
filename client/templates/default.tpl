<!doctype html>
<!--[if lt IE 7]>      <html lang="<%= language  %>" class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html lang="<%= language  %>" class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html lang="<%= language  %>" class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!--> <html lang="<%= language  %>" class="no-js"> <!--<![endif]-->
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <base href="/">
    <title><%- _.compact([title, appName]).join('|')  %></title>
    <meta name="description" content="<%= description %>">
    <meta name="viewport" content="width=device-width">

    <link rel="icon" href="images/icons/favicon.ico" type="image/x-icon">
    <!-- For third-generation iPad with high-resolution Retina display: -->
    <link rel="apple-touch-icon-precomposed" sizes="144x144" href="images/icons/apple-touch-icon-144x144-precomposed.png">
    <!-- For iPhone with high-resolution Retina display: -->
    <link rel="apple-touch-icon-precomposed" sizes="114x114" href="images/icons/apple-touch-icon-114x114-precomposed.png">
    <!-- For first- and second-generation iPad: -->
    <link rel="apple-touch-icon-precomposed" sizes="72x72" href="images/icons/apple-touch-icon-72x72-precomposed.png">
    <!-- For non-Retina iPhone, iPod Touch, and Android 2.1+ devices: -->
    <link rel="apple-touch-icon-precomposed" href="images/icons/apple-touch-icon-precomposed.png">

    <!-- 
    <link href='http://fonts.googleapis.com/css?family=Open+Sans:300italic,400italic,400,300' rel='stylesheet' type='text/css'>
    -->
    <link rel="stylesheet" href="styles/styles.css">
    <!-- 
    <script type="text/javascript" src="/scripts/modernizr.js"></script>
    -->
  </head>
  <body>

    <!--[if lt IE 7]>
      <p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>
    <![endif]-->

    <!--[if lt IE 9]>
      <script src="/bower_components/es5-shim/es5-shim.js"></script>
      <script src="/bower_components/json3/lib/json3.min.js"></script>
    <![endif]-->

    <div class="container">
      <div class="row">
        <div class="sidebar column medium-3">
          <h1 class="logo">
            <a href="#"><%- appName %></a>
          </h1>
          <nav>
            <ul>
              <% _.each(navigation, function(link, linkPath) { %>
              <li>
                <a href="<%- linkPath %>"><%- link.title %></a>
                
                <% if (link.links) { %>
                <ul>
                  <% _.each(link.links, function(subLink, subPath) { %>
                  <li>
                    <a href="<%- subPath %>"><%- subLink.title %></a>
                  </li>
                  <% }); %>
                </ul>
                <% } %>
              </li>
              <% }); %>
            </ul>
          </nav>
        </div>

        <section class="column medium-9">
          <header class="page">
            <ul class="breadcrumbs">
              <% _.each([
              ], function(link) { %>
              <li><a href="<%- link.path %>"><%- link.title %></a></li>
              <% }) %>
            </ul>

            <h1><%- title %></h1>
          </header>

          
          <div class="content container">
            <%= body %>
          </div>
        </section>
      </div>


      <footer class="row page">
        <nav>
          <ul>
            
          </ul>
        </nav>
      </footer>
    </div>

    
    <% if (googleAnalyticsUA) { %>
    <script>
       (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
       (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
       m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
       })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

       ga('create', '<%- googleAnalyticsUA %>');
       ga('send', 'pageview');
    </script>
    <% } %>

    
    <script data-main="scripts/index.js" src="scripts/deps.js"></script>

  </body>
</html>
