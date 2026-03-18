useEffect(() => {
  async function getProfile() {
    const res = await fetch('/api/user/profile');
    const profileData = await res.json();
    if(!profileData.error) {
       setProfile(profileData);
       setUserRole(profileData.role);
       setUserPlan(profileData.subscription_plan);
    }
  }
  getProfile();
}, []);