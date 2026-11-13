import dotenv from 'dotenv';
// Test servers must never inherit real credentials or personal data paths.
if(process.env.NODE_ENV!=='test'&&process.env.IGNORE_LOCAL_ENV!=='true')dotenv.config({quiet:true});
