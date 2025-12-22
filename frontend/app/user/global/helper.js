export async function isRegistered(Contract, addr) {
      const user = await Contract.Users(addr);
      const isRegistered = user[5];

      return {
        isRegistered,
        message: isRegistered
          ? "Team Chain: Your address IS registered."
          : "Team Chain: Your address is NOT registered."
      };
}