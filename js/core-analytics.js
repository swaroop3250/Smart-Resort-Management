(function () {
  const core = window.DashboardCoreData;
  if (!core) return;

  const {
    CONFIG,
    fromISODate,
    toISODate,
    getDurationNights,
  } = core;

  const isDateInStay = (dateIso, booking) => dateIso >= booking.checkIn && dateIso < booking.checkOut;

  const calculateOccupancy = (bookings, totalAvailableRooms, todayIso) => {
    const activeStays = bookings.filter(
      (booking) => booking.status === "active" && isDateInStay(todayIso, booking)
    ).length;
    const occupancyRate = totalAvailableRooms
      ? Number(((activeStays / totalAvailableRooms) * 100).toFixed(1))
      : 0;
    let occupancyClass = "occupancy-low";
    if (occupancyRate >= 80) occupancyClass = "occupancy-high";
    else if (occupancyRate > 50) occupancyClass = "occupancy-medium";

    return { activeStays, occupancyRate, occupancyClass };
  };

  const calculateTodayOperations = (bookings, todayIso) => ({
    checkInsToday: bookings.filter(
      (booking) => booking.checkIn === todayIso && booking.status !== "cancelled"
    ),
    checkOutsToday: bookings.filter(
      (booking) => booking.checkOut === todayIso && booking.status !== "cancelled"
    ),
  });

  const calculateRevenueBreakdown = (bookings, todayDate) => {
    const valid = bookings.filter((booking) => booking.status !== "cancelled");
    const totals = valid.reduce(
      (acc, booking) => {
        acc.base += booking.baseAmount;
        acc.weekend += booking.weekendCharge;
        acc.extraGuest += booking.extraGuestCharge;
        acc.gst += booking.gstAmount;
        acc.total += booking.totalAmount;
        return acc;
      },
      { base: 0, weekend: 0, extraGuest: 0, gst: 0, total: 0 }
    );

    const month = todayDate.getMonth();
    const year = todayDate.getFullYear();
    const mtdRevenue = valid.reduce((sum, booking) => {
      const created = fromISODate(booking.createdAt);
      if (created.getMonth() === month && created.getFullYear() === year) {
        return sum + booking.totalAmount;
      }
      return sum;
    }, 0);

    const elapsedDays = todayDate.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const averagePerDay = elapsedDays > 0 ? mtdRevenue / elapsedDays : 0;
    const remainingDays = Math.max(0, daysInMonth - elapsedDays);
    const projectedMonthlyRevenue = mtdRevenue + averagePerDay * remainingDays;

    return {
      ...totals,
      averagePerDay,
      projectedMonthlyRevenue,
    };
  };

  const getMonthBoundaries = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { start, end };
  };

  const overlapDaysInMonth = (booking, monthStart, monthEnd) => {
    const start = fromISODate(booking.checkIn);
    const end = fromISODate(booking.checkOut);
    const overlapStart = start > monthStart ? start : monthStart;
    const overlapEnd = end < monthEnd ? end : monthEnd;
    const days = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, days);
  };

  const calculateRoomPerformance = (bookings, todayDate, roomNames) => {
    const { start, end } = getMonthBoundaries(todayDate);
    const roomMap = {};

    roomNames.forEach((name) => {
      roomMap[name] = { roomName: name, bookedDays: 0, revenue: 0, bookingsCount: 0 };
    });

    bookings
      .filter((booking) => booking.status !== "cancelled")
      .forEach((booking) => {
        const overlapDays = overlapDaysInMonth(booking, start, end);
        if (overlapDays <= 0) return;
        const totalNights = Math.max(1, getDurationNights(booking.checkIn, booking.checkOut));
        const ratio = overlapDays / totalNights;
        const allocatedRevenue = booking.totalAmount * ratio;
        const target = roomMap[booking.roomName] || {
          roomName: booking.roomName,
          bookedDays: 0,
          revenue: 0,
          bookingsCount: 0,
        };
        target.bookedDays += overlapDays;
        target.revenue += allocatedRevenue;
        target.bookingsCount += 1;
        roomMap[booking.roomName] = target;
      });

    const rows = Object.values(roomMap)
      .map((row) => ({
        ...row,
        bookedDays: Number(row.bookedDays.toFixed(1)),
        revenue: Math.round(row.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topPerformer = rows[0] || null;
    const lowPerformer = [...rows].sort((a, b) => a.revenue - b.revenue)[0] || null;

    return { rows, topPerformer, lowPerformer };
  };

  const detectBookingRisk = (booking) => {
    const nights = getDurationNights(booking.checkIn, booking.checkOut);
    const highRisk = nights < 1;
    const leadHours =
      (fromISODate(booking.checkIn).getTime() - fromISODate(booking.createdAt).getTime()) /
      (1000 * 60 * 60);
    const lastMinute = leadHours >= 0 && leadHours <= 24;
    return { highRisk, lastMinute };
  };

  const timeToMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };

  const hasIdleGap = (activities) => {
    if (!Array.isArray(activities) || activities.length < 2) return false;
    const sorted = [...activities].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    for (let i = 0; i < sorted.length - 1; i += 1) {
      if (sorted[i].date !== sorted[i + 1].date) continue;
      const gap = timeToMinutes(sorted[i + 1].startTime) - timeToMinutes(sorted[i].endTime);
      if (gap > 300) return true;
    }
    return false;
  };

  const computeEngagement = (bookings) => {
    const activityCounts = {};
    const engagementByBooking = {};
    let totalScore = 0;
    let count = 0;
    let guestsBelow30 = 0;
    let lowUtilizationBookings = 0;

    bookings
      .filter((booking) => booking.status !== "cancelled")
      .forEach((booking) => {
        const nights = Math.max(1, getDurationNights(booking.checkIn, booking.checkOut));
        const possible = nights * CONFIG.possibleActivitiesPerDay;
        const selected = booking.activities.length;
        const score = possible > 0 ? (selected / possible) * 100 : 0;
        const lowUtilization = hasIdleGap(booking.activities);

        engagementByBooking[booking.id] = {
          score,
          lowUtilization,
        };

        if (score < 30) guestsBelow30 += booking.guests;
        if (lowUtilization) lowUtilizationBookings += 1;
        totalScore += score;
        count += 1;

        booking.activities.forEach((activity) => {
          activityCounts[activity.name] = (activityCounts[activity.name] || 0) + 1;
        });
      });

    const topActivities = Object.entries(activityCounts)
      .map(([name, countValue]) => ({ name, count: countValue }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      averageEngagement: count > 0 ? Number((totalScore / count).toFixed(1)) : 0,
      guestsBelow30,
      lowUtilizationBookings,
      topActivities,
      engagementByBooking,
      totalActivitySelections: Object.values(activityCounts).reduce((sum, n) => sum + n, 0),
    };
  };

  const generateAlerts = ({ occupancy, roomPerformance, engagement, highRiskCount }) => {
    const alerts = [];
    if (occupancy.occupancyRate > 85) {
      alerts.push({
        severity: "high",
        message: `Occupancy is at ${occupancy.occupancyRate}%. Consider overflow planning.`,
      });
    }

    const lowRevenueRooms = roomPerformance.rows.filter(
      (room) => room.bookedDays > 0 && room.revenue < CONFIG.roomRevenueThreshold
    );
    if (lowRevenueRooms.length > 0) {
      alerts.push({
        severity: "medium",
        message: `${lowRevenueRooms.length} room type(s) are below revenue threshold.`,
      });
    }

    if (engagement.averageEngagement < 20) {
      alerts.push({
        severity: "medium",
        message: `Activity participation is low (${engagement.averageEngagement}%).`,
      });
    }

    if (highRiskCount > 3) {
      alerts.push({
        severity: "high",
        message: `${highRiskCount} high-risk booking(s) detected.`,
      });
    }

    if (alerts.length === 0) {
      alerts.push({ severity: "info", message: "No critical alerts at this time." });
    }

    return alerts;
  };

  const buildDateRange = (days, endIso) => {
    const end = fromISODate(endIso);
    const list = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(end);
      date.setDate(end.getDate() - i);
      list.push(toISODate(date));
    }
    return list;
  };

  const getRevenueTrendSeries = (bookings, dates) =>
    dates.map((dateIso) =>
      bookings.reduce(
        (sum, booking) =>
          booking.createdAt === dateIso && booking.status !== "cancelled"
            ? sum + booking.totalAmount
            : sum,
        0
      )
    );

  const getOccupancyTrendSeries = (bookings, dates) =>
    dates.map(
      (dateIso) =>
        bookings.filter((booking) => booking.status === "active" && isDateInStay(dateIso, booking)).length
    );

  const getActivityDensitySeries = (bookings) => {
    const hourly = Array(24).fill(0);
    bookings
      .filter((booking) => booking.status !== "cancelled")
      .forEach((booking) => {
        booking.activities.forEach((activity) => {
          const hour = Number(activity.startTime.split(":")[0]);
          if (hour >= 0 && hour < 24) hourly[hour] += 1;
        });
      });
    return hourly;
  };

  const getStatusOverview = (bookings) =>
    bookings.reduce(
      (acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      },
      { active: 0, completed: 0, cancelled: 0 }
    );

  const getTodayIso = () => toISODate(new Date());

  window.DashboardCoreAnalytics = {
    isDateInStay,
    calculateOccupancy,
    calculateTodayOperations,
    calculateRevenueBreakdown,
    calculateRoomPerformance,
    detectBookingRisk,
    computeEngagement,
    generateAlerts,
    buildDateRange,
    getRevenueTrendSeries,
    getOccupancyTrendSeries,
    getActivityDensitySeries,
    getStatusOverview,
    getTodayIso,
  };
})();
