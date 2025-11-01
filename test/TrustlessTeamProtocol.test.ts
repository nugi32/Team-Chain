import { expect } from "chai";
import { ethers } from "hardhat";

describe("TrustlessTeamProtocol", function () {
  async function deployFixture() {
    const [deployer, treasury, observer, member1, member2] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("EmployeeAssignmentMock");
    const mock = await Mock.deploy(deployer.address);
    await mock.waitForDeployment();

    const Protocol = await ethers.getContractFactory("TrustlessTeamProtocol");
    const protocol = await Protocol.deploy();
    await protocol.waitForDeployment();

    await protocol.initialize(
      await mock.getAddress(),
      treasury.address,
      1000 // memberStakePercent (10%)
    );

    return { deployer, treasury, observer, member1, member2, mock, protocol };
  }

  it("initializes correctly", async () => {
    const { protocol, treasury } = await deployFixture();
    expect(await protocol.treasury()).to.equal(treasury.address);
  });

  it("creates a task with empty members", async () => {
    const { protocol } = await deployFixture();

    const title = "Task 1";
    const reward = ethers.parseEther("0.1");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
    const maxRev = 3;

    await expect(
      protocol.createTask(title, reward, deadline, maxRev, { value: 0 })
    ).to.not.be.reverted;

    const taskId = await protocol.taskCounter();
    const tasksAny = await (protocol as any).Tasks(0);
    expect(tasksAny.title).to.equal(title);
    expect(tasksAny.creator).to.not.equal(ethers.ZeroAddress);
    expect(tasksAny.member.length).to.equal(0);
  });

  it("member requests to join and creator approves", async () => {
    const { protocol, member1 } = await deployFixture();

    const title = "Task 2";
    const reward = ethers.parseEther("0.2");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    await protocol.createTask(title, reward, deadline, 2, { value: 0 });

    const taskId = await protocol.taskCounter();
    await expect(protocol.connect(member1).requestJoinTask(taskId, { value: 0 }))
      .to.not.be.reverted;
    await expect(protocol.approveJoinRequest(taskId, member1.address)).to.not.be.reverted;
  });

  it("creator can close and reopen registration", async () => {
    const { protocol } = await deployFixture();
    const title = "Task 3";
    const reward = ethers.parseEther("0.05");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60);

    await protocol.createTask(title, reward, deadline, 1, { value: 0 });
    const taskId = await protocol.taskCounter();

    await expect(protocol.closeRegistration(taskId)).to.not.be.reverted;
    await expect(protocol.openRegistration(taskId)).to.not.be.reverted;
  });
});



