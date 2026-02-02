const { default: mongoose } = require("mongoose");
const {
  catchAsync,
  AppError,
  sendSuccess,
} = require("../../utils/errorHandler");
const clientModel = require("../../models/clientModel");
const projectMode = require("../../models/projectMode");
const { isValidCustomUUID } = require("custom-uuid-generator");
const hoursModel = require("../../models/hoursModel");
const calculateLateHoursByDate = require("../../utils/weekLateCount");
const calculateLateByProjectEnd = require("../../utils/calculateLate");
// <--------- Single client own details  ----------->

exports.getClientInformation = catchAsync(async (req, res, next) => {
  const { client_id } = req;
  if (!client_id || client_id.length === 0 || client_id === undefined) {
    return next(new AppError("client id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(client_id)) {
    return next(new AppError("Invalid client ObjectId"));
  }

  const isClient = await clientModel
    .findOne({
      _id: client_id,
      isDelete: false,
    })
    .select("-client_url ");

  if (!isClient) {
    return next(new AppError("client not found", 400));
  }
  return sendSuccess(res, "Success", isClient, 200, true);
});

// <--------- Single client own details  ----------->

// <----get clients workers ---------->

exports.getClientWorkers = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { cli } = req.query;
  if (!tenantId || tenantId.length === 0) {
    return next(new AppError("tenant-id missing in the headers", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    return next(new AppError("Invalid tenantId", 400));
  }

  if (!cli || cli.length === 0) {
    return next(new AppError("client-id missing", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(cli)) {
    return next(new AppError("Invalid client id", 400));
  }

  const workers = await projectMode.findOne({ tenantId });
});
// <----get clients workers end ---------->

// <------ client signatue false true ----------->
// is sing cliend
exports.isClientSign = catchAsync(async (req, res, next) => {
  const { tenantId, client_id } = req;
  if (!tenantId) {
    return next(new AppError("Tenant Id missing in headers", 400));
  }

  if (!isValidCustomUUID(tenantId)) {
    return next(new AppError("Invalid Tenant-Id", 400));
  }
  if (!client_id) {
    return next(new AppError("client Id missing in headers", 400));
  }

  const client = await clientModel.findOne({ _id: client_id, tenantId });
  // console.log(client);
  const data = {
    _id: client?._id,
    isSign: client?.isSignatured,
  };
  return sendSuccess(res, "success", data, 200, true);
});

// client workers
exports.getAllHoursOfWorkerToClientController = catchAsync(
  async (req, res, next) => {
    const { tenantId, client_id } = req;
    /* ---------- TENANT VALIDATION ---------- */
    if (!tenantId) {
      return next(new AppError("Tenant Id missing in headers", 400));
    }

    if (!isValidCustomUUID(tenantId)) {
      return next(new AppError("Invalid Tenant-Id", 400));
    }

    /* ---------- PAGINATION ---------- */
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit =
      Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 100) : 10;
    const skip = (page - 1) * limit;

    /* ---------- CURRENT WEEK (MON–SUN) ---------- */
    const today = new Date();
    const day = today.getDay() === 0 ? 7 : today.getDay();

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - day + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const client_project = await projectMode
      .find({ tenantId, "client_details.client": client_id })
      .select("project_workers.workers");
    const workerIds = [];
    client_project.forEach((val) =>
      workerIds.push(...val?.project_workers.workers),
    );
    /* ---------- FETCH ONLY CURRENT WEEK DATA ---------- */
    const hoursData = await hoursModel
      .find({
        tenantId,
        workerId: { $in: workerIds },
        createdAt: {
          $gte: weekStart,
          $lte: weekEnd,
        },
      })
      .populate([
        {
          path: "project.projectId",
          select: "project_details.project_name",
        },
        {
          path: "workerId",
          select:
            "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture",
          populate: {
            path: "worker_position",
            select: "position",
          },
        },
      ])
      .sort({ createdAt: -1 })
      .lean();

    /* ---------- WORKER MAP (LATE CHECK) ---------- */
    const workerMap = new Map();

    for (const item of hoursData) {
      const workerKey = item.workerId?._id?.toString();
      if (!workerKey) continue;

      const lateResult = calculateLateHoursByDate({
        projectDate: item.project?.project_date,
        finishHours: item.finish_hours,
        submittedAt: item.createdAt,
        dayOff: item.day_off,
        graceMinutes: 0,
      });

      if (!workerMap.has(workerKey)) {
        workerMap.set(workerKey, {
          latest: item,
          is_late: lateResult.isLate,
          late_minutes: lateResult.lateMinutes,
          late_time: lateResult.lateTime,
        });
      } else {
        const existing = workerMap.get(workerKey);

        if (lateResult.isLate) {
          existing.is_late = true;

          if (lateResult.lateMinutes > existing.late_minutes) {
            existing.late_minutes = lateResult.lateMinutes;
            existing.late_time = lateResult.lateTime;
          }
        }
      }
    }

    /* ---------- HOURS FORMATTER ---------- */
    const formatHours = (decimalHours = 0) => {
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);

      return {
        decimal: decimalHours.toFixed(2),
        hours,
        minutes,
        label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
      };
    };

    /* ---------- WEEK RANGE LABEL ---------- */
    const formatWeekRangeLabel = (startDate, endDate) => {
      const options = { day: "numeric", month: "short" };
      return `${new Date(startDate).toLocaleDateString(
        "en-IN",
        options,
      )} - ${new Date(endDate).toLocaleDateString(
        "en-IN",
        options,
      )} ${new Date(endDate).getFullYear()}`;
    };

    /* ---------- TRANSFORM DATA ---------- */
    const transformedData = Array.from(workerMap.values()).map(
      ({ latest, is_late, late_minutes, late_time }) => ({
        _id: latest._id,
        tenantId: latest.tenantId,

        worker: latest.workerId
          ? {
              _id: latest.workerId._id,
              firstName:
                latest.workerId.worker_personal_details?.firstName || "",
              lastName: latest.workerId.worker_personal_details?.lastName || "",
              position: latest.workerId.worker_position?.[0]?.position || "",
              profile_picture:
                latest.workerId.personal_information.documents.profile_picture,
            }
          : null,

        project: latest.project?.projectId
          ? {
              _id: latest.project.projectId._id,
              project_name:
                latest.project.projectId.project_details?.project_name || "",
              project_date: latest.project.project_date,
            }
          : null,

        weekNumber: latest.weekNumber,
        status: latest.status,
        start_working_hours: latest.start_working_hours,
        finish_hours: latest.finish_hours,
        break_time: latest.break_time,
        comments: latest.comments,
        image: latest.image,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt,
        createdBy: latest.createdBy || "",
        total_hours: formatHours(latest.total_hours),

        // ✅ WORKER LEVEL LATE FLAG
        is_late,
        late_time,
        late_minutes,

        weekRange: {
          startDate: weekStart.toISOString().split("T")[0],
          endDate: weekEnd.toISOString().split("T")[0],
          label: formatWeekRangeLabel(weekStart, weekEnd),
        },
      }),
    );

    /* ---------- PAGINATION ---------- */
    const paginatedData = transformedData.slice(skip, skip + limit);

    /* ---------- RESPONSE ---------- */
    return sendSuccess(
      res,
      "Current week worker hours fetched successfully",
      {
        total: transformedData.length,
        page,
        limit,
        totalPages: Math.ceil(transformedData.length / limit),
        data: paginatedData,
      },
      200,
      true,
    );
  },
);

// single worker weeks hours llsit for client
exports.getSingleWorkerWeeklyHoursToClientController = catchAsync(
  async (req, res, next) => {
    const { tenantId, client_id } = req;
    const { workerId } = req.query;
    const weekOffset = Number(req.query.weekOffset) || 0;

    /* ---------- VALIDATION ---------- */
    if (!tenantId) {
      return next(new AppError("Tenant Id missing in headers", 400));
    }

    if (!isValidCustomUUID(tenantId)) {
      return next(new AppError("Invalid Tenant-Id", 400));
    }

    if (!workerId) {
      return next(new AppError("Worker Id missing", 400));
    }
    /* ---------- WEEK CALCULATION (MON–SUN) ---------- */
    const today = new Date();
    const day = today.getDay() === 0 ? 7 : today.getDay();

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - day + 1 + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const client_project = await projectMode
      .find({ tenantId, "client_details.client": client_id })
      .select("project_workers.workers");
    const workerIds = [];
    client_project.forEach((val) =>
      workerIds.push(...val?.project_workers.workers),
    );
    /* ---------- FETCH DATA ---------- */
    const hoursData = await hoursModel
      .find({
        tenantId,
        workerId: { $in: workerIds },
        createdAt: { $gte: weekStart, $lte: weekEnd },
      })
      .populate([
        {
          path: "project.projectId",
          select:
            "project_details.project_name project_details.project_location_address",
        },
        {
          path: "workerId",
          select:
            "worker_personal_details.firstName worker_personal_details.lastName worker_position personal_information.documents.profile_picture",
          populate: {
            path: "worker_position",
            select: "position",
          },
        },
      ])
      .sort({ createdAt: 1 })
      .lean();
    /* ---------- HOURS FORMATTER ---------- */
    const formatHours = (decimalHours = 0) => {
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);

      return {
        decimal: decimalHours.toFixed(2),
        hours,
        minutes,
        label: `${decimalHours.toFixed(2)} h (${hours}h ${minutes}min)`,
      };
    };

    /* ---------- TRANSFORM DATA ---------- */
    const finalData = hoursData.map((obj) => {
      const lateResult = calculateLateByProjectEnd({
        projectDate: obj.project?.project_date,
        finishHours: obj.finish_hours,
        submittedAt: obj.createdAt,
        dayOff: obj.day_off,
        graceMinutes: 0, // configurable
      });

      return {
        _id: obj._id,
        date: obj.createdAt,

        worker: obj.workerId
          ? {
              _id: obj.workerId._id,
              firstName: obj.workerId.worker_personal_details?.firstName || "",
              lastName: obj.workerId.worker_personal_details?.lastName || "",
              position: obj.workerId.worker_position?.[0]?.position || "",
              profile_picture:
                obj.workerId.personal_information.documents.profile_picture,
            }
          : null,

        project: obj.project?.projectId
          ? {
              _id: obj.project.projectId._id,
              project_name:
                obj.project.projectId?.project_details?.project_name || "",
              project_date: obj.project.project_date || "",
              address:
                obj.project.projectId.project_details
                  ?.project_location_address || "",
            }
          : null,

        start_working_hours: obj.start_working_hours,
        finish_hours: obj.finish_hours,
        break_time: obj.break_time,
        day_off: obj.day_off,
        weekNumber: obj.weekNumber,
        status: obj.status,
        comments: obj.comments,
        image: obj.image,
        createdBy: obj?.createdBy || "",
        total_hours: formatHours(obj.total_hours),

        // ✅ LATE INFO
        is_late: lateResult.isLate,
        late_time: lateResult.lateTime,
        late_minutes: lateResult.lateMinutes,
      };
    });

    /* ---------- RESPONSE ---------- */
    return sendSuccess(
      res,
      "Worker weekly hours fetched successfully",
      finalData,
      200,
      true,
    );
  },
);
