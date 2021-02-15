describe('My Login application', () => {
    it('should login with valid credentials', () => {
        browser.url(`https://the-internet.herokuapp.com/login`);

        expect($('#username')).toBeExisting();
    });
});
