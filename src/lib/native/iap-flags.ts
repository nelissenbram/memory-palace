/**
 * IAP master switch — isolated in a dependency-free module so it can be imported
 * from the Edge middleware (which must NOT pull in Capacitor via ./platform) as
 * well as from client code. While false, all iOS purchase UI stays hidden and the
 * app is cleanly free on iOS (Apple Guideline 3.1.1); flip to true only once the
 * IAP products are Approved in App Store Connect and submitted with a build.
 */
export const IAP_ENABLED = true;
