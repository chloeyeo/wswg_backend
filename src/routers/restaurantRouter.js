const express = require("express");
const Restaurant = require("../models/Restaurant");
const restaurantRouter = express.Router();

const mateType = [
  { no: 1, cateId: "lover", name: "연인" },
  { no: 2, cateId: "friend", name: "친구" },
  { no: 3, cateId: "family", name: "가족" },
  { no: 4, cateId: "group", name: "단체모임" },
  { no: 5, cateId: "pet", name: "반려동물" },
  { no: 6, cateId: "self", name: "혼밥" },
];

const validCateIds = mateType.map((type) => type.cateId);
restaurantRouter.get("/:cateId", async (req, res) => {
  try {
    const { cateId } = req.params;
    if (!validCateIds.includes(cateId)) {
      return res.status(400).send({ error: "Invalid cateId parameter" });
    }
    const mateTypeName = mateType.find((type) => type.cateId === cateId)?.name; // 해당 cateId의 mateType 이름 찾기
    const limit = req.query.limit ? Number(req.query.limit) : 0;
    const skip = req.query.skip ? Number(req.query.skip) : 0;
    const { search, filters, foodtype } = req.query;
    const findArgs = {
      "category.mateType": mateTypeName,
      "category.foodType": foodtype,
    };
    if (filters) {
      if (filters.metropolitan) {
        findArgs["address.metropolitan"] = filters.metropolitan;
      }
      if (filters.city) {
        findArgs["address.city"] = filters.city;
      }
    }
    if (search) {
      findArgs["name"] = { $regex: search, $options: "i" };
    }
    const restaurant = await Restaurant.find(findArgs).limit(limit).skip(skip);
    const restaurantsTotal = await Restaurant.countDocuments(findArgs);
    const hasMore = skip + limit < restaurantsTotal ? true : false;
    return res.status(200).send({ restaurant, hasMore });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});
restaurantRouter.get("/:cateId/:rtId", async (req, res) => {
  try {
    const { rtId, cateId } = req.params;
    if (!validCateIds.includes(cateId)) {
      return res.status(400).send({ error: "Invalid cateId parameter" });
    }
    const mateTypeName = mateType.find((type) => type.cateId === cateId)?.name; // 해당 cateId의 mateType 이름 찾기
    const restaurant = await Restaurant.findOne({
      _id: rtId,
      "category.mateType": mateTypeName,
    });
    return res.status(200).send({ restaurant });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});
restaurantRouter.post("/:cateId/:rtId/view", async (req, res) => {
  try {
    const { cateId, rtId } = req.params;
    if (!validCateIds.includes(cateId)) {
      return res.status(400).send({ error: "Invalid cateId parameter" });
    }
    const restaurant = await Restaurant.findById(rtId);
    restaurant.views++;
    await restaurant.save();
    res.status(200).send({ restaurant });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

restaurantRouter.post("/location", async (req, res) => {
  try {
    const { lat, lon, cateId } = req.body;
    if (!validCateIds.includes(cateId)) {
      return res.status(400).send({ error: "Invalid cateId parameter" });
    }
    const mateTypeName = mateType.find((type) => type.cateId === cateId)?.name;
    const { filters } = req.query;
    const findArgs = {};
    if (cateId) {
      findArgs["category.mateType"] = mateTypeName;
    }
    if (filters) {
      if (filters.metropolitan) {
        findArgs["address.metropolitan"] = filters.metropolitan;
      }
      if (filters.city) {
        findArgs["address.city"] = filters.city;
      }
      if (filters.district) {
        findArgs["address.district"] = filters.district;
      }
    }
    // 현재 위치에서 2km 이내의 레스토랑 데이터 조회
    const restaurant = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lon), parseFloat(lat)], // 경도, 위도 순서
          },
          distanceField: "distance",
          maxDistance: 1500, // 최대 거리 (미터 단위, 여기서는 2km) 2000
          spherical: true,
        },
      },
      { $match: findArgs },
    ]);
    return res.status(200).json({ restaurant }); // 조회된 레스토랑 데이터를 JSON 응답으로 보냄
  } catch (e) {
    console.log(e.message);
    return res.status(500).json({ error: "데이터 조회 중 오류 발생" });
  }
});
restaurantRouter.get("/", async (req, res) => {
  try {
    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);
    const restaurant = await Restaurant.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude], // 경도, 위도 순서
          },
          distanceField: "distance", // 결과 문서에 추가될 필드 이름
          maxDistance: 1, // 최대 거리 (미터 단위)
          spherical: true, // 구 형태의 지구를 고려할지 여부
        },
      },
    ]).limit(1);
    res.status(200).send({ restaurant });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

module.exports = restaurantRouter;
