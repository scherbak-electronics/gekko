# SEKO

Trading software (fork of askmike/gekko [https://github.com/askmike/gekko])

# How Banking System Works
![inspired by](web/vue/public/static/dancer.gif)


# Install

Clone this repository and switch to `seco-improvements-grid` branch.
Then install with following command:

    npm install --only=production

NOTE: You may see a vulnerability warning from NPM, dont worry, it's ok))
You also need to install Gekko (SEKO) Broker's dependencies, run:

    cd exchange
    npm install --only=production
    cd ../web/vue
    npm install --only=production
    npm install -g @vue/cli
    vue upgrade 
    npm run build
    cd ../../


# Run

After all the above you can start Gekko (SEKO) by running the following in your terminal:

    node gekko --ui


# What is improved.

User inteface refactored, TradingView chart added, removed unused modules,
removed strategy interface, and all useless TA libraries, 
implemented only one most efficient grid strategy which use only Market Type orders,
removed backtesting since it does not make sence with grid strategy.
Added enable/disable trading checkboxes, improved orders layout, enable/disable order feature allows to
include or exclude orders from trading, if order is enable it will be used by trading logic, enable/disable real orders creation on real api account, refactored trading logic, sync with exchange after every create order action. Grid step currency amount calculation improved, now it calculates the amount for one price step as percent from current currency amount but only if amount changing up after placing order or any other trade action like buy or sell. so balance able to change up with progression.
Added ability to set or re-set initial balance.  

![Trading interface](web/vue/public/static/screenshot.png)