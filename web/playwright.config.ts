import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',timeout:60000,workers:1,fullyParallel:false,
 reporter:[['list'],['json',{outputFile:'test-results/e2e.json'}]],
 use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1440,height:1080},headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
});
