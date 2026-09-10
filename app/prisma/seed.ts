import { PrismaClient } from "@prisma/client";
import { LEAVE_CATALOG } from "../src/lib/leave-catalog";
import { ALL_SEED_HOLIDAYS } from "./holidays";
import { annualLeaveSchedule } from "../src/lib/annual-leave";

const prisma = new PrismaClient();

function d(s: string) {
  return new Date(s + "T00:00:00+08:00");
}

async function main() {
  console.log("→ 清除既有資料 …");
  // 依外鍵順序刪除
  await prisma.approval.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.anomaly.deleteMany();
  await prisma.complianceAlert.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.compTimeEntry.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.overtimeRequest.deleteMany();
  await prisma.businessTrip.deleteMany();
  await prisma.outing.deleteMany();
  await prisma.wfhRequest.deleteMany();
  await prisma.shiftSwap.deleteMany();
  await prisma.delegation.deleteMany();
  await prisma.punchCorrection.deleteMany();
  await prisma.punchRecord.deleteMany();
  await prisma.attendanceDaily.deleteMany();
  await prisma.employeeChange.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.workSchedule.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.organization.deleteMany();

  console.log("→ 建立公司 / 班別 …");
  const org = await prisma.organization.create({
    data: { name: "綠谷國際 GV STUDIO", taxId: "00000000" },
  });

  const schedule = await prisma.workSchedule.create({
    data: {
      name: "台北正常班",
      workStart: "09:00",
      workEnd: "18:00",
      lunchMinutes: 60,
      flexMinutes: 0,
      workdays: "1,2,3,4,5",
    },
  });

  console.log("→ 建立部門 …");
  const deptMgmt = await prisma.department.create({
    data: { orgId: org.id, name: "管理部" },
  });
  const deptDesign = await prisma.department.create({
    data: { orgId: org.id, name: "設計部" },
  });
  const deptBiz = await prisma.department.create({
    data: { orgId: org.id, name: "業務部" },
  });

  console.log("→ 建立假別主檔（勞基法全假別）…");
  for (const lt of LEAVE_CATALOG) {
    await prisma.leaveType.create({
      data: {
        code: lt.code,
        name: lt.name,
        legalBasis: lt.legalBasis,
        unit: lt.unit,
        paidRate: lt.paidRate,
        annualQuota: lt.annualQuota ?? undefined,
        statutoryCap: lt.statutoryCap ?? undefined,
        attachmentRule: lt.attachmentRule,
        attachmentNote: lt.attachmentNote ?? undefined,
        countsAs: lt.countsAs ?? undefined,
        deferrable: lt.deferrable,
        needsHrReview: lt.needsHrReview,
        active: lt.code !== "EPIDEMIC",
        sortOrder: lt.sortOrder,
      },
    });
  }

  console.log(`→ 匯入行事曆（${ALL_SEED_HOLIDAYS.length} 筆，115 / 116 年）…`);
  for (const h of ALL_SEED_HOLIDAYS) {
    await prisma.holiday.create({
      data: {
        date: d(h.date),
        name: h.name,
        type: h.type,
        appliesTo: h.appliesTo ?? "ALL",
        isWorkday: h.isWorkday ?? false,
        note: h.note,
      },
    });
  }

  console.log("→ 建立示範員工 …");
  const employees = [
    {
      employeeNo: "GV001",
      name: "王曉明",
      email: "hr@gvstudio.tw",
      dept: deptMgmt.id,
      title: "人資經理",
      role: "HR",
      hire: "2018-02-01",
      salary: 68000,
      bonus: 2000,
      manager: null as number | null,
    },
    {
      employeeNo: "GV002",
      name: "陳美麗",
      email: "cindy@gvstudio.tw",
      dept: deptDesign.id,
      title: "設計部主管",
      role: "MANAGER",
      hire: "2019-06-15",
      salary: 62000,
      bonus: 2000,
      manager: 1,
    },
    {
      employeeNo: "GV003",
      name: "林志豪",
      email: "hao@gvstudio.tw",
      dept: deptDesign.id,
      title: "資深設計師",
      role: "EMPLOYEE",
      hire: "2022-03-01",
      salary: 48000,
      bonus: 1500,
      manager: 2,
    },
    {
      employeeNo: "GV004",
      name: "張雅婷",
      email: "yating@gvstudio.tw",
      dept: deptDesign.id,
      title: "設計師",
      role: "EMPLOYEE",
      hire: "2025-04-07",
      salary: 40000,
      bonus: 1500,
      manager: 2,
    },
    {
      employeeNo: "GV005",
      name: "黃建國",
      email: "kuo@gvstudio.tw",
      dept: deptBiz.id,
      title: "業務部主管",
      role: "MANAGER",
      hire: "2020-09-01",
      salary: 60000,
      bonus: 2000,
      manager: 1,
    },
    {
      employeeNo: "GV006",
      name: "吳佩珊",
      email: "peishan@gvstudio.tw",
      dept: deptBiz.id,
      title: "業務專員",
      role: "EMPLOYEE",
      hire: "2026-06-01",
      salary: 38000,
      bonus: 1500,
      manager: 5,
    },
  ];

  const idMap: Record<number, number> = {};
  let seq = 1;
  for (const e of employees) {
    const created = await prisma.employee.create({
      data: {
        orgId: org.id,
        employeeNo: e.employeeNo,
        name: e.name,
        email: e.email,
        deptId: e.dept,
        positionTitle: e.title,
        role: e.role,
        scheduleId: schedule.id,
        workLocation: "台北",
        hireDate: d(e.hire),
        monthlySalary: e.salary,
        fullAttendanceBonus: e.bonus,
        laborInsuranceSelf: Math.round(e.salary * 0.02),
        healthInsuranceSelf: Math.round(e.salary * 0.0155),
        pensionSelfPercent: 0,
        employmentType: "FULL_TIME",
        status: "ACTIVE",
      },
    });
    idMap[seq] = created.id;
    seq += 1;

    // 到職異動
    await prisma.employeeChange.create({
      data: {
        employeeId: created.id,
        type: "HIRE",
        effectiveDate: d(e.hire),
        toValue: `${e.title} @ 綠谷國際`,
      },
    });
  }

  // 回填 managerId
  seq = 1;
  for (const e of employees) {
    if (e.manager) {
      await prisma.employee.update({
        where: { id: idMap[seq] },
        data: { managerId: idMap[e.manager] },
      });
    }
    seq += 1;
  }
  // 部門主管
  await prisma.department.update({
    where: { id: deptDesign.id },
    data: { managerId: idMap[2] },
  });
  await prisma.department.update({
    where: { id: deptBiz.id },
    data: { managerId: idMap[5] },
  });
  await prisma.department.update({
    where: { id: deptMgmt.id },
    data: { managerId: idMap[1] },
  });

  console.log("→ 依到職日建立特休額度（週年制）…");
  const annualType = await prisma.leaveType.findUnique({ where: { code: "ANNUAL" } });
  for (const [k, empId] of Object.entries(idMap)) {
    const emp = await prisma.employee.findUnique({ where: { id: empId } });
    if (!emp || !annualType) continue;
    const sched = annualLeaveSchedule(emp.hireDate, new Date());
    // 只建最近 2 個年度
    for (const g of sched.slice(-2)) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_periodStart: {
            employeeId: empId,
            leaveTypeId: annualType.id,
            periodStart: g.grantDate,
          },
        },
        create: {
          employeeId: empId,
          leaveTypeId: annualType.id,
          periodStart: g.grantDate,
          periodEnd: g.periodEnd,
          grantedDays: g.days,
          usedDays: 0,
          pendingDays: 0,
        },
        update: { grantedDays: g.days, periodEnd: g.periodEnd },
      });
    }
  }

  console.log("→ 建立公告 …");
  await prisma.announcement.create({
    data: {
      title: "系統上線公告",
      body:
        "綠谷國際線上人資考勤系統啟用。上班時間 09:00–18:00，請每日刷卡；" +
        "請假、加班、出差一律線上申請，簽核結果將透過 LINE 通知。",
      pinned: true,
      createdBy: idMap[1],
    },
  });

  console.log("✅ Seed 完成");
  console.log("   登入帳號（示範，無密碼）：");
  console.log("   - 王曉明（人資）  hr@gvstudio.tw");
  console.log("   - 陳美麗（設計主管）cindy@gvstudio.tw");
  console.log("   - 林志豪（設計師）  hao@gvstudio.tw");
  console.log("   - 張雅婷（2025 到職）yating@gvstudio.tw");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
