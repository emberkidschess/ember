import { Request, Response } from 'express';
import Class, { ClassStatus } from '../models/Class';
import Staff from '../models/Staff';
import { AuthRequest } from '../middleware/auth';

export const getCoachSalary = async (req: AuthRequest, res: Response) => {
  try {
    const { coachId, month, year } = req.query;
    
    const coach = coachId || req.user?.userId;
    
    if (!coach) {
      return res.status(400).json({
        success: false,
        error: 'Coach ID is required',
      });
    }

    const coachUser = await Staff.findById(coach);
    if (!coachUser) {
      return res.status(404).json({
        success: false,
        error: 'Coach not found',
      });
    }

    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const completedClasses = await Class.find({
      coach,
      status: ClassStatus.COMPLETED,
      date: { $gte: startDate, $lte: endDate },
    });

    const completedCount = completedClasses.length;
    const salaryPerClass = coachUser.salaryPerClass || 0;
    const totalSalary = completedCount * salaryPerClass;

    res.json({
      success: true,
      data: {
        coachId: coach,
        coachName: coachUser.name,
        coachEmail: coachUser.email,
        month: targetMonth,
        year: targetYear,
        salaryPerClass,
        completedClasses: completedCount,
        totalSalary,
        classes: completedClasses.map(c => ({
          id: c._id,
          date: c.date,
          course: c.course,
          startTime: c.startTime,
          endTime: c.endTime,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching coach salary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch salary information',
    });
  }
};

export const getAllCoachesSalary = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query;
    
    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const coaches = await Staff.find({
      salaryPerClass: { $gt: 0 },
    });

    const salaryData = await Promise.all(
      coaches.map(async (coach: any) => {
        const completedClasses = await Class.find({
          coach: coach._id,
          status: ClassStatus.COMPLETED,
          date: { $gte: startDate, $lte: endDate },
        });

        const completedCount = completedClasses.length;
        const salaryPerClass = coach.salaryPerClass || 0;
        const totalSalary = completedCount * salaryPerClass;

        return {
          coachId: coach._id,
          coachName: coach.name,
          coachEmail: coach.email,
          salaryPerClass,
          completedClasses: completedCount,
          totalSalary,
        };
      })
    );

    const totalSalary = salaryData.reduce((sum: number, item: any) => sum + item.totalSalary, 0);

    res.json({
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        coaches: salaryData,
        totalSalary,
      },
    });
  } catch (error) {
    console.error('Error fetching all coaches salary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch salary information',
    });
  }
};
